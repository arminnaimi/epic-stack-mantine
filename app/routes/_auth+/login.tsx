import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	type MetaFunction,
} from "@remix-run/node";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";
import { HoneypotInputs } from "remix-utils/honeypot/react";
import { z } from "zod";
import { GeneralErrorBoundary } from "#app/components/error-boundary.tsx";
import { ErrorList } from "#app/components/forms.tsx";
import { Spacer } from "#app/components/spacer.tsx";
import { login, requireAnonymous } from "#app/utils/auth.server.ts";
import {
	ProviderConnectionForm,
	providerNames,
} from "#app/utils/connections.tsx";
import { checkHoneypot } from "#app/utils/honeypot.server.ts";
import { useIsPending } from "#app/utils/misc.tsx";
import { PasswordSchema, UsernameSchema } from "#app/utils/user-validation.ts";
import { handleNewSession } from "./login.server.ts";
import {
	Box,
	Button,
	Container,
	Flex,
	Divider,
	Text,
	Title,
	TextInput,
	PasswordInput,
	Checkbox,
	Anchor,
} from "@mantine/core";

const LoginFormSchema = z.object({
	username: UsernameSchema,
	password: PasswordSchema,
	redirectTo: z.string().optional(),
	remember: z.boolean().optional(),
});

export async function loader({ request }: LoaderFunctionArgs) {
	await requireAnonymous(request);
	return json({});
}

export async function action({ request }: ActionFunctionArgs) {
	await requireAnonymous(request);
	const formData = await request.formData();
	checkHoneypot(formData);
	const submission = await parseWithZod(formData, {
		schema: (intent) =>
			LoginFormSchema.transform(async (data, ctx) => {
				if (intent !== null) return { ...data, session: null };

				const session = await login(data);
				if (!session) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: "Invalid username or password",
					});
					return z.NEVER;
				}

				return { ...data, session };
			}),
		async: true,
	});

	if (submission.status !== "success" || !submission.value.session) {
		return json(
			{ result: submission.reply({ hideFields: ["password"] }) },
			{ status: submission.status === "error" ? 400 : 200 },
		);
	}

	const { session, remember, redirectTo } = submission.value;

	return handleNewSession({
		request,
		session,
		remember: remember ?? false,
		redirectTo,
	});
}

export default function LoginPage() {
	const actionData = useActionData<typeof action>();
	const isPending = useIsPending();
	const [searchParams] = useSearchParams();
	const redirectTo = searchParams.get("redirectTo");

	const [form, fields] = useForm({
		id: "login-form",
		constraint: getZodConstraint(LoginFormSchema),
		defaultValue: { redirectTo },
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: LoginFormSchema });
		},
		shouldRevalidate: "onBlur",
	});

	return (
		<Flex direction="column" mih="100%" justify="center" pb="md" pt="xl">
			<Container size="xs" w="100%">
				<Flex direction="column" gap="3" className="text-center">
					<Title>Welcome back!</Title>
					<Text>Please enter your details.</Text>
				</Flex>
				<Spacer size="xs" />

				<Box>
					<Flex gap="3" direction="column">
						<Form method="POST" {...getFormProps(form)}>
							<HoneypotInputs />
							<TextInput
								label="Username"
								autoFocus={true}
								autoComplete="username"
								error={fields.username.errors}
								{...getInputProps(fields.username, { type: "text" })}
							/>

							<PasswordInput
								label="Password"
								autoComplete="current-password"
								error={fields.password.errors}
								{...getInputProps(fields.password, {
									type: "password",
								})}
							/>

							<Flex gap="md" my="sm" align="center" justify="space-between">
								<Checkbox
									label="Remember me"
									error={fields.remember.errors}
									{...getInputProps(fields.remember, {
										type: "checkbox",
									})}
								/>

								<Anchor size="sm" component={Link} to="/forgot-password">
									Forgot password?
								</Anchor>
							</Flex>

							<input
								{...getInputProps(fields.redirectTo, { type: "hidden" })}
							/>
							<ErrorList errors={form.errors} id={form.errorId} />

							<Flex justify="center">
								<Button type="submit" disabled={isPending} loading={isPending}>
									Log in
								</Button>
							</Flex>
						</Form>

						<Divider my="lg" />

						<Flex mb="lg" direction="column" gap="lg">
							{providerNames.map((providerName) => (
								<ProviderConnectionForm
									key={providerName}
									type="Login"
									providerName={providerName}
									redirectTo={redirectTo}
								/>
							))}
						</Flex>
					</Flex>
					<Flex gap="lg" justify="center" align="center">
						<Text>New here?</Text>
						<Button variant="gradient">
							<Link
								to={
									redirectTo
										? `/signup?${encodeURIComponent(redirectTo)}`
										: "/signup"
								}
							>
								Create an account
							</Link>
						</Button>
					</Flex>
				</Box>
			</Container>
		</Flex>
	);
}

export const meta: MetaFunction = () => {
	return [{ title: "Login to Epic Notes" }];
};

export function ErrorBoundary() {
	return <GeneralErrorBoundary />;
}
