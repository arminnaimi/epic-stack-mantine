import { invariantResponse } from "@epic-web/invariant";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useLoaderData, type MetaFunction } from "@remix-run/react";
import { GeneralErrorBoundary } from "#app/components/error-boundary.tsx";
import { Spacer } from "#app/components/spacer.tsx";
import { prisma } from "#app/utils/db.server.ts";
import { getUserImgSrc } from "#app/utils/misc.tsx";
import { useOptionalUser } from "#app/utils/user.ts";
import {
	Box,
	Button,
	Card,
	Container,
	Flex,
	Image,
	Text,
	Title,
} from "@mantine/core";
import { ExitIcon } from "@radix-ui/react-icons";

export async function loader({ params }: LoaderFunctionArgs) {
	const user = await prisma.user.findFirst({
		select: {
			id: true,
			name: true,
			username: true,
			createdAt: true,
			image: { select: { id: true } },
		},
		where: {
			username: params.username,
		},
	});

	invariantResponse(user, "User not found", { status: 404 });

	return json({ user, userJoinedDisplay: user.createdAt.toLocaleDateString() });
}

export default function ProfileRoute() {
	const data = useLoaderData<typeof loader>();
	const user = data.user;
	const userDisplayName = user.name ?? user.username;
	const loggedInUser = useOptionalUser();
	const isLoggedInUser = data.user.id === loggedInUser?.id;

	return (
		<Container
			px={{
				initial: "6",
				lg: "0",
			}}
		>
			<Box pos="relative" mt="xl">
				<Spacer size="3xs" />

				<Flex
					justify="center"
					align="center"
					pos="absolute"
					w="100%"
					className="z-50 -top-16"
				>
					<Image
						radius="xl"
						src={getUserImgSrc(data.user.image?.id)}
						alt={userDisplayName}
						className="h-52 w-52 rounded-full object-cover"
					/>
				</Flex>

				<Card shadow="sm" padding="lg" radius="md" withBorder>
					<Flex direction="column" align="center" p="6" className="rounded-3xl">
						<Spacer size="sm" />

						<Flex direction="column" align="center">
							<Flex wrap="wrap" align="center" justify="center" gap="md">
								<Title className="text-center">{userDisplayName}</Title>
							</Flex>
							<Text component="p" mt="sm" className="text-center">
								Joined {data.userJoinedDisplay}
							</Text>
							{isLoggedInUser ? (
								<Form action="/logout" method="POST" className="mt-3">
									<Button
										type="submit"
										variant="subtle"
										leftSection={
											<ExitIcon className="scale-125 max-md:scale-150" />
										}
									>
										Logout
									</Button>
								</Form>
							) : null}
							<Flex gap="md" mt="md">
								{isLoggedInUser ? (
									<>
										<Button>
											<Link to="notes" prefetch="intent">
												My notes
											</Link>
										</Button>
										<Button>
											<Link to="/settings/profile" prefetch="intent">
												Edit profile
											</Link>
										</Button>
									</>
								) : (
									<Button>
										<Link to="notes" prefetch="intent">
											{userDisplayName}'s notes
										</Link>
									</Button>
								)}
							</Flex>
						</Flex>
					</Flex>
				</Card>
			</Box>
		</Container>
	);
}

export const meta: MetaFunction<typeof loader> = ({ data, params }) => {
	const displayName = data?.user.name ?? params.username;
	return [
		{ title: `${displayName} | Epic Notes` },
		{
			name: "description",
			content: `Profile of ${displayName} on Epic Notes`,
		},
	];
};

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<p>No user with the username "{params.username}" exists</p>
				),
			}}
		/>
	);
}
