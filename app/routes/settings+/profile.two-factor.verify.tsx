import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import type { SEOHandle } from "@nasa-gcn/remix-seo";
import {
	json,
	redirect,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from "@remix-run/node";
import {
	Form,
	useActionData,
	useLoaderData,
	useNavigation,
} from "@remix-run/react";
import * as QRCode from "qrcode";
import { z } from "zod";
import { ErrorList } from "#app/components/forms.tsx";
import { isCodeValid } from "#app/routes/_auth+/verify.server.ts";
import { requireUserId } from "#app/utils/auth.server.ts";
import { prisma } from "#app/utils/db.server.ts";
import { getDomainUrl, useIsPending } from "#app/utils/misc.tsx";
import { redirectWithToast } from "#app/utils/toast.server.ts";
import { getTOTPAuthUri } from "#app/utils/totp.server.ts";
import type { BreadcrumbHandle } from "./profile.tsx";
import { twoFAVerificationType } from "./profile.two-factor.tsx";
import { CheckIcon } from "@radix-ui/react-icons";
import { Box, Button, Code, Flex, PinInput, Text } from "@mantine/core";

export const handle: BreadcrumbHandle & SEOHandle = {
	breadcrumb: (
		<Button variant="subtle">
			<CheckIcon />
			Verify
		</Button>
	),
	getSitemapEntries: () => null,
};

const CancelSchema = z.object({ intent: z.literal("cancel") });
const VerifySchema = z.object({
	intent: z.literal("verify"),
	code: z.string().min(6).max(6),
});

const ActionSchema = z.discriminatedUnion("intent", [
	CancelSchema,
	VerifySchema,
]);

export const twoFAVerifyVerificationType = "2fa-verify";

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request);
	const verification = await prisma.verification.findUnique({
		where: {
			target_type: { type: twoFAVerifyVerificationType, target: userId },
		},
		select: {
			id: true,
			algorithm: true,
			secret: true,
			period: true,
			digits: true,
		},
	});
	if (!verification) {
		return redirect("/settings/profile/two-factor");
	}
	const user = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: { email: true },
	});
	const issuer = new URL(getDomainUrl(request)).host;
	const otpUri = getTOTPAuthUri({
		...verification,
		accountName: user.email,
		issuer,
	});
	const qrCode = await QRCode.toDataURL(otpUri);
	return json({ otpUri, qrCode });
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request);
	const formData = await request.formData();

	const submission = await parseWithZod(formData, {
		schema: () =>
			ActionSchema.superRefine(async (data, ctx) => {
				if (data.intent === "cancel") return null;
				const codeIsValid = await isCodeValid({
					code: data.code,
					type: twoFAVerifyVerificationType,
					target: userId,
				});
				if (!codeIsValid) {
					ctx.addIssue({
						path: ["code"],
						code: z.ZodIssueCode.custom,
						message: "Invalid code",
					});
					return z.NEVER;
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

	switch (submission.value.intent) {
		case "cancel": {
			await prisma.verification.deleteMany({
				where: { type: twoFAVerifyVerificationType, target: userId },
			});
			return redirect("/settings/profile/two-factor");
		}
		case "verify": {
			await prisma.verification.update({
				where: {
					target_type: { type: twoFAVerifyVerificationType, target: userId },
				},
				data: { type: twoFAVerificationType },
			});
			return redirectWithToast("/settings/profile/two-factor", {
				type: "success",
				title: "Enabled",
				description: "Two-factor authentication has been enabled.",
			});
		}
	}
}

export default function TwoFactorRoute() {
	const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const navigation = useNavigation();

	const isPending = useIsPending();
	const pendingIntent = isPending ? navigation.formData?.get("intent") : null;

	const [form, fields] = useForm({
		id: "verify-form",
		constraint: getZodConstraint(ActionSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ActionSchema });
		},
	});
	const lastSubmissionIntent = fields.intent.value;

	return (
		<Box>
			<Flex direction="column" align="center" gap="md">
				<img alt="qr code" src={data.qrCode} className="h-56 w-56" />
				<Text component="p">
					Scan this QR code with your authenticator app.
				</Text>
				<Text component="p">
					If you cannot scan the QR code, you can manually add this account to
					your authenticator app using this code:
				</Text>
				<Box p="3">
					<Code
						className="whitespace-pre-wrap break-all"
						aria-label="One-time Password URI"
					>
						{data.otpUri}
					</Code>
				</Box>
				<Text component="p">
					Once you've added the account, enter the code from your authenticator
					app below. Once you enable 2FA, you will need to enter a code from
					your authenticator app every time you log in or perform important
					actions. Do not lose access to your authenticator app, or you will
					lose access to your account.
				</Text>
				<Flex direction="column" w="100%" justify="center" gap="md">
					<Form method="POST" {...getFormProps(form)} className="flex-1">
						<Flex align="center" justify="center">
							<PinInput
								autoFocus={true}
								oneTimeCode
								error={!!fields.code.errors}
								{...getInputProps(fields.code, { type: "number" })}
							/>
						</Flex>

						<Box mih="32px" px="md" pb="sm" pt="xs">
							<ErrorList id={form.errorId} errors={form.errors} />
						</Box>

						<Flex justify="center" gap="md">
							<Button
								loading={
									pendingIntent === "verify" ||
									lastSubmissionIntent === "verify"
								}
								type="submit"
								name="intent"
								value="verify"
							>
								Submit
							</Button>
							<Button
								variant="outline"
								loading={
									pendingIntent === "cancel" ||
									lastSubmissionIntent === "cancel"
								}
								type="submit"
								name="intent"
								value="cancel"
								disabled={isPending}
							>
								Cancel
							</Button>
						</Flex>
					</Form>
				</Flex>
			</Flex>
		</Box>
	);
}
