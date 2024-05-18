import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { invariantResponse } from "@epic-web/invariant";
import type { SEOHandle } from "@nasa-gcn/remix-seo";
import {
	json,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from "@remix-run/node";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";
import { z } from "zod";
import { ErrorList } from "#app/components/forms.tsx";
import { requireUserId, sessionKey } from "#app/utils/auth.server.ts";
import { prisma } from "#app/utils/db.server.ts";
import { getUserImgSrc, useDoubleCheck } from "#app/utils/misc.tsx";
import { authSessionStorage } from "#app/utils/session.server.ts";
import { redirectWithToast } from "#app/utils/toast.server.ts";
import { NameSchema, UsernameSchema } from "#app/utils/user-validation.ts";
import { twoFAVerificationType } from "./profile.two-factor.tsx";
import {
	AvatarIcon,
	CameraIcon,
	DotsHorizontalIcon,
	DownloadIcon,
	EnvelopeClosedIcon,
	Link2Icon,
	LockClosedIcon,
	LockOpen1Icon,
	TrashIcon,
} from "@radix-ui/react-icons";
import {
	Box,
	Button,
	Divider,
	Flex,
	ActionIcon,
	TextInput,
	SimpleGrid,
} from "@mantine/core";

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
};

const ProfileFormSchema = z.object({
	name: NameSchema.optional(),
	username: UsernameSchema,
});

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request);
	const user = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: {
			id: true,
			name: true,
			username: true,
			email: true,
			image: {
				select: { id: true },
			},
			_count: {
				select: {
					sessions: {
						where: {
							expirationDate: { gt: new Date() },
						},
					},
				},
			},
		},
	});

	const twoFactorVerification = await prisma.verification.findUnique({
		select: { id: true },
		where: { target_type: { type: twoFAVerificationType, target: userId } },
	});

	const password = await prisma.password.findUnique({
		select: { userId: true },
		where: { userId },
	});

	return json({
		user,
		hasPassword: Boolean(password),
		isTwoFactorEnabled: Boolean(twoFactorVerification),
	});
}

type ProfileActionArgs = {
	request: Request;
	userId: string;
	formData: FormData;
};
const profileUpdateActionIntent = "update-profile";
const signOutOfSessionsActionIntent = "sign-out-of-sessions";
const deleteDataActionIntent = "delete-data";

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request);
	const formData = await request.formData();
	const intent = formData.get("intent");
	switch (intent) {
		case profileUpdateActionIntent: {
			return profileUpdateAction({ request, userId, formData });
		}
		case signOutOfSessionsActionIntent: {
			return signOutOfSessionsAction({ request, userId, formData });
		}
		case deleteDataActionIntent: {
			return deleteDataAction({ request, userId, formData });
		}
		default: {
			throw new Response(`Invalid intent "${intent}"`, { status: 400 });
		}
	}
}

export default function EditUserProfile() {
	const data = useLoaderData<typeof loader>();

	return (
		<Flex direction="column" gap="xl">
			<Flex justify="center">
				<Box pos="relative" className="h-52 w-52">
					<img
						src={getUserImgSrc(data.user.image?.id)}
						alt={data.user.username}
						className="h-full w-full rounded-full object-cover"
					/>
					<ActionIcon
						component={Link}
						variant="soft"
						pos="absolute"
						right={-3}
						top={3}
						className="flex h-10 w-10 items-center justify-center rounded-full p-0"
						preventScrollReset
						to="photo"
						title="Change profile photo"
						aria-label="Change profile photo"
					>
						<CameraIcon />
					</ActionIcon>
				</Box>
			</Flex>
			<UpdateProfile />

			<Divider />

			<div className="col-span-full flex flex-col gap-6">
				<Box>
					<Button
						component={Link}
						leftSection={<EnvelopeClosedIcon />}
						to="change-email"
					>
						Change email from {data.user.email}
					</Button>
				</Box>
				<Box>
					<Button
						component={Link}
						leftSection={
							data.isTwoFactorEnabled ? <LockClosedIcon /> : <LockOpen1Icon />
						}
						to="two-factor"
					>
						{data.isTwoFactorEnabled ? <>2FA is enabled</> : <>Enable 2FA</>}
					</Button>
				</Box>
				<Box>
					<Button
						component={Link}
						leftSection={<DotsHorizontalIcon />}
						to={data.hasPassword ? "password" : "password/create"}
					>
						{data.hasPassword ? "Change Password" : "Create a Password"}
					</Button>
				</Box>
				<Box>
					<Button component={Link} leftSection={<Link2Icon />} to="connections">
						Manage connections
					</Button>
				</Box>
				<Box>
					<Button
						component={Link}
						leftSection={<DownloadIcon />}
						reloadDocument
						download="my-epic-notes-data.json"
						to="/resources/download-user-data"
					>
						Download your data
					</Button>
				</Box>
				<SignOutOfSessions />
				<DeleteData />
			</div>
		</Flex>
	);
}

async function profileUpdateAction({ userId, formData }: ProfileActionArgs) {
	const submission = await parseWithZod(formData, {
		async: true,
		schema: ProfileFormSchema.superRefine(async ({ username }, ctx) => {
			const existingUsername = await prisma.user.findUnique({
				where: { username },
				select: { id: true },
			});
			if (existingUsername && existingUsername.id !== userId) {
				ctx.addIssue({
					path: ["username"],
					code: z.ZodIssueCode.custom,
					message: "A user already exists with this username",
				});
			}
		}),
	});
	if (submission.status !== "success") {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === "error" ? 400 : 200 },
		);
	}

	const data = submission.value;

	await prisma.user.update({
		select: { username: true },
		where: { id: userId },
		data: {
			name: data.name,
			username: data.username,
		},
	});

	return json({
		result: submission.reply(),
	});
}

function UpdateProfile() {
	const data = useLoaderData<typeof loader>();

	const fetcher = useFetcher<typeof profileUpdateAction>();

	const [form, fields] = useForm({
		id: "edit-profile",
		constraint: getZodConstraint(ProfileFormSchema),
		lastResult: fetcher.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ProfileFormSchema });
		},
		defaultValue: {
			username: data.user.username,
			name: data.user.name,
		},
	});

	return (
		<fetcher.Form method="POST" {...getFormProps(form)}>
			<SimpleGrid cols={6}>
				<TextInput
					className="col-span-3"
					label="Username"
					error={fields.username.errors}
					{...getInputProps(fields.username, { type: "text" })}
				/>
				<TextInput
					className="col-span-3"
					label="Name"
					error={fields.name.errors}
					{...getInputProps(fields.name, { type: "text" })}
				/>
			</SimpleGrid>

			<ErrorList errors={form.errors} id={form.errorId} />

			<Flex justify="center" mt="xl">
				<Button
					type="submit"
					name="intent"
					value={profileUpdateActionIntent}
					loading={fetcher.state !== "idle"}
				>
					Save changes
				</Button>
			</Flex>
		</fetcher.Form>
	);
}

async function signOutOfSessionsAction({ request, userId }: ProfileActionArgs) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get("cookie"),
	);
	const sessionId = authSession.get(sessionKey);
	invariantResponse(
		sessionId,
		"You must be authenticated to sign out of other sessions",
	);
	await prisma.session.deleteMany({
		where: {
			userId,
			id: { not: sessionId },
		},
	});
	return json({ status: "success" } as const);
}

function SignOutOfSessions() {
	const data = useLoaderData<typeof loader>();
	const dc = useDoubleCheck();

	const fetcher = useFetcher<typeof signOutOfSessionsAction>();
	const otherSessionsCount = data.user._count.sessions - 1;
	return (
		<div>
			{otherSessionsCount ? (
				<fetcher.Form method="POST">
					<Button
						color={dc.doubleCheck ? "red" : undefined}
						loading={fetcher.state !== "idle"}
						leftSection={<AvatarIcon />}
						{...dc.getButtonProps({
							type: "submit",
							name: "intent",
							value: signOutOfSessionsActionIntent,
						})}
					>
						{dc.doubleCheck
							? "Are you sure?"
							: `Sign out of ${otherSessionsCount} other sessions`}
					</Button>
				</fetcher.Form>
			) : (
				<Button leftSection={<AvatarIcon />}>This is your only session</Button>
			)}
		</div>
	);
}

async function deleteDataAction({ userId }: ProfileActionArgs) {
	await prisma.user.delete({ where: { id: userId } });
	return redirectWithToast("/", {
		type: "success",
		title: "Data Deleted",
		description: "All of your data has been deleted",
	});
}

function DeleteData() {
	const dc = useDoubleCheck();

	const fetcher = useFetcher<typeof deleteDataAction>();
	return (
		<div>
			<fetcher.Form method="POST">
				<Button
					color={dc.doubleCheck ? "red" : undefined}
					loading={fetcher.state !== "idle"}
					leftSection={<TrashIcon />}
					{...dc.getButtonProps({
						type: "submit",
						name: "intent",
						value: deleteDataActionIntent,
					})}
				>
					{dc.doubleCheck ? "Are you sure?" : "Delete all your data"}
				</Button>
			</fetcher.Form>
		</div>
	);
}
