import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import * as E from "@react-email/components";
import {
	json,
	redirect,
	type ActionFunctionArgs,
	type MetaFunction,
} from "@remix-run/node";
import { Link, useFetcher } from "@remix-run/react";
import { HoneypotInputs } from "remix-utils/honeypot/react";
import { z } from "zod";
import { GeneralErrorBoundary } from "#app/components/error-boundary.tsx";
import { ErrorList } from "#app/components/forms.tsx";
import { prisma } from "#app/utils/db.server.ts";
import { sendEmail } from "#app/utils/email.server.ts";
import { checkHoneypot } from "#app/utils/honeypot.server.ts";
import { EmailSchema, UsernameSchema } from "#app/utils/user-validation.ts";
import { prepareVerification } from "./verify.server.ts";
import {
	Box,
	Button,
	Container,
	Flex,
	Text,
	Title,
	Anchor,
	TextInput,
} from "@mantine/core";

const ForgotPasswordSchema = z.object({
	usernameOrEmail: z.union([EmailSchema, UsernameSchema]),
});

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	checkHoneypot(formData);
	const submission = await parseWithZod(formData, {
		schema: ForgotPasswordSchema.superRefine(async (data, ctx) => {
			const user = await prisma.user.findFirst({
				where: {
					OR: [
						{ email: data.usernameOrEmail },
						{ username: data.usernameOrEmail },
					],
				},
				select: { id: true },
			});
			if (!user) {
				ctx.addIssue({
					path: ["usernameOrEmail"],
					code: z.ZodIssueCode.custom,
					message: "No user exists with this username or email",
				});
				return;
			}
		}),
		async: true,
	});
	if (submission.status !== "success") {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === "error" ? 400 : 200 },
		);
	}
	const { usernameOrEmail } = submission.value;

	const user = await prisma.user.findFirstOrThrow({
		where: { OR: [{ email: usernameOrEmail }, { username: usernameOrEmail }] },
		select: { email: true, username: true },
	});

	const { verifyUrl, redirectTo, otp } = await prepareVerification({
		period: 10 * 60,
		request,
		type: "reset-password",
		target: usernameOrEmail,
	});

	const response = await sendEmail({
		to: user.email,
		subject: "Epic Notes Password Reset",
		react: (
			<ForgotPasswordEmail onboardingUrl={verifyUrl.toString()} otp={otp} />
		),
	});

	if (response.status === "success") {
		return redirect(redirectTo.toString());
	}
	return json(
		{ result: submission.reply({ formErrors: [response.error.message] }) },
		{ status: 500 },
	);
}

function ForgotPasswordEmail({
	onboardingUrl,
	otp,
}: {
	onboardingUrl: string;
	otp: string;
}) {
	return (
		<E.Html lang="en" dir="ltr">
			<E.Container>
				<h1>
					<E.Text>Epic Notes Password Reset</E.Text>
				</h1>
				<p>
					<E.Text>
						Here's your verification code: <strong>{otp}</strong>
					</E.Text>
				</p>
				<p>
					<E.Text>Or click the link:</E.Text>
				</p>
				<E.Link href={onboardingUrl}>{onboardingUrl}</E.Link>
			</E.Container>
		</E.Html>
	);
}

export const meta: MetaFunction = () => {
	return [{ title: "Password Recovery for Epic Notes" }];
};

export default function ForgotPasswordRoute() {
	const forgotPassword = useFetcher<typeof action>();

	const [form, fields] = useForm({
		id: "forgot-password-form",
		constraint: getZodConstraint(ForgotPasswordSchema),
		lastResult: forgotPassword.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ForgotPasswordSchema });
		},
		shouldRevalidate: "onBlur",
	});

	return (
		<Container>
			<Flex direction="column" justify="center">
				<Box className="text-center">
					<Title>Forgot Password</Title>
					<Text>No worries, we'll send you reset instructions.</Text>
				</Box>
				<Container>
					<forgotPassword.Form method="POST" {...getFormProps(form)}>
						<HoneypotInputs />
						<Box>
							<TextInput
								label="Username or Email"
								autoFocus={true}
								{...getInputProps(fields.usernameOrEmail, { type: "text" })}
								error={fields.usernameOrEmail.errors}
							/>
						</Box>
						<ErrorList errors={form.errors} id={form.errorId} />

						<Box mt="lg">
							<Button
								type="submit"
								loading={forgotPassword.state === "submitting"}
								disabled={forgotPassword.state !== "idle"}
							>
								Recover password
							</Button>
						</Box>
					</forgotPassword.Form>
					<Anchor component={Link} to="/login">
						Back to Login
					</Anchor>
				</Container>
			</Flex>
		</Container>
	);
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />;
}
