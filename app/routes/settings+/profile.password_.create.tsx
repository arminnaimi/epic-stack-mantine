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
import { ErrorList } from "#app/components/forms.tsx";
import { getPasswordHash, requireUserId } from "#app/utils/auth.server.ts";
import { prisma } from "#app/utils/db.server.ts";
import { useIsPending } from "#app/utils/misc.tsx";
import { PasswordAndConfirmPasswordSchema } from "#app/utils/user-validation.ts";
import type { BreadcrumbHandle } from "./profile.tsx";
import { Button, PasswordInput, TextInput } from "@mantine/core";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";

export const handle: BreadcrumbHandle & SEOHandle = {
	breadcrumb: (
		<>
			<DotsHorizontalIcon />
			Password
		</>
	),
	getSitemapEntries: () => null,
};

const CreatePasswordForm = PasswordAndConfirmPasswordSchema;

async function requireNoPassword(userId: string) {
	const password = await prisma.password.findUnique({
		select: { userId: true },
		where: { userId },
	});
	if (password) {
		throw redirect("/settings/profile/password");
	}
}

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request);
	await requireNoPassword(userId);
	return json({});
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request);
	await requireNoPassword(userId);
	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		async: true,
		schema: CreatePasswordForm,
	});
	if (submission.status !== "success") {
		return json(
			{
				result: submission.reply({
					hideFields: ["password", "confirmPassword"],
				}),
			},
			{ status: submission.status === "error" ? 400 : 200 },
		);
	}

	const { password } = submission.value;

	await prisma.user.update({
		select: { username: true },
		where: { id: userId },
		data: {
			password: {
				create: {
					hash: await getPasswordHash(password),
				},
			},
		},
	});

	return redirect("/settings/profile", { status: 302 });
}

export default function CreatePasswordRoute() {
	const actionData = useActionData<typeof action>();
	const isPending = useIsPending();

	const [form, fields] = useForm({
		id: "password-create-form",
		constraint: getZodConstraint(CreatePasswordForm),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: CreatePasswordForm });
		},
		shouldRevalidate: "onBlur",
	});

	return (
		<Form method="POST" {...getFormProps(form)} className="mx-auto max-w-md">
			<PasswordInput
				label="New Password"
				autoComplete="new-password"
				error={fields.password.errors}
				{...getInputProps(fields.password, { type: "password" })}
			/>
			<PasswordInput
				label="Confirm New Password"
				autoComplete="new-password"
				error={fields.confirmPassword.errors}
				{...getInputProps(fields.confirmPassword, {
					type: "password",
				})}
			/>
			<ErrorList id={form.errorId} errors={form.errors} />
			<div className="grid w-full grid-cols-2 gap-6">
				<Button variant="outline">
					<Link to="..">Cancel</Link>
				</Button>
				<Button type="submit" loading={isPending}>
					Create Password
				</Button>
			</div>
		</Form>
	);
}
