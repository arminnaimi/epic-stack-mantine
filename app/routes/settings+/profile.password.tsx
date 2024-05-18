import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import type { SEOHandle } from "@nasa-gcn/remix-seo";
import {
	json,
	redirect,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from "@remix-run/node";
import { Form, Link, useActionData } from "@remix-run/react";
import { z } from "zod";
import { ErrorList } from "#app/components/forms.tsx";
import {
	getPasswordHash,
	requireUserId,
	verifyUserPassword,
} from "#app/utils/auth.server.ts";
import { prisma } from "#app/utils/db.server.ts";
import { useIsPending } from "#app/utils/misc.tsx";
import { redirectWithToast } from "#app/utils/toast.server.ts";
import { PasswordSchema } from "#app/utils/user-validation.ts";
import type { BreadcrumbHandle } from "./profile.tsx";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { Button, PasswordInput, SimpleGrid } from "@mantine/core";

export const handle: BreadcrumbHandle & SEOHandle = {
	breadcrumb: (
		<Button variant="subtle">
			<DotsHorizontalIcon /> Password
		</Button>
	),
	getSitemapEntries: () => null,
};

const ChangePasswordForm = z
	.object({
		currentPassword: PasswordSchema,
		newPassword: PasswordSchema,
		confirmNewPassword: PasswordSchema,
	})
	.superRefine(({ confirmNewPassword, newPassword }, ctx) => {
		if (confirmNewPassword !== newPassword) {
			ctx.addIssue({
				path: ["confirmNewPassword"],
				code: z.ZodIssueCode.custom,
				message: "The passwords must match",
			});
		}
	});

async function requirePassword(userId: string) {
	const password = await prisma.password.findUnique({
		select: { userId: true },
		where: { userId },
	});
	if (!password) {
		throw redirect("/settings/profile/password/create");
	}
}

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request);
	await requirePassword(userId);
	return json({});
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request);
	await requirePassword(userId);
	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		async: true,
		schema: ChangePasswordForm.superRefine(
			async ({ currentPassword, newPassword }, ctx) => {
				if (currentPassword && newPassword) {
					const user = await verifyUserPassword(
						{ id: userId },
						currentPassword,
					);
					if (!user) {
						ctx.addIssue({
							path: ["currentPassword"],
							code: z.ZodIssueCode.custom,
							message: "Incorrect password.",
						});
					}
				}
			},
		),
	});
	if (submission.status !== "success") {
		return json(
			{
				result: submission.reply({
					hideFields: ["currentPassword", "newPassword", "confirmNewPassword"],
				}),
			},
			{ status: submission.status === "error" ? 400 : 200 },
		);
	}

	const { newPassword } = submission.value;

	await prisma.user.update({
		select: { username: true },
		where: { id: userId },
		data: {
			password: {
				update: {
					hash: await getPasswordHash(newPassword),
				},
			},
		},
	});

	return redirectWithToast(
		"/settings/profile",
		{
			type: "success",
			title: "Password Changed",
			description: "Your password has been changed.",
		},
		{ status: 302 },
	);
}

export default function ChangePasswordRoute() {
	const actionData = useActionData<typeof action>();
	const isPending = useIsPending();

	const [form, fields] = useForm({
		id: "password-change-form",
		constraint: getZodConstraint(ChangePasswordForm),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ChangePasswordForm });
		},
		shouldRevalidate: "onBlur",
	});

	return (
		<Form method="POST" {...getFormProps(form)} className="mx-auto max-w-md">
			<PasswordInput
				label="Current Password"
				autoComplete="current-password"
				error={fields.currentPassword.errors}
				{...getInputProps(fields.currentPassword, { type: "password" })}
			/>
			<PasswordInput
				label="New Password"
				autoComplete="new-password"
				error={fields.newPassword.errors}
				{...getInputProps(fields.newPassword, { type: "password" })}
			/>
			<PasswordInput
				label="Confirm New Password"
				autoComplete="new-password"
				error={fields.confirmNewPassword.errors}
				{...getInputProps(fields.confirmNewPassword, { type: "password" })}
			/>
			<ErrorList id={form.errorId} errors={form.errors} />
			<SimpleGrid cols={2} w="100%">
				<Button variant="outline" component={Link} to="..">
					Cancel
				</Button>
				<Button type="submit" loading={isPending}>
					Change Password
				</Button>
			</SimpleGrid>
		</Form>
	);
}
