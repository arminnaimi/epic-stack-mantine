import { invariantResponse } from "@epic-web/invariant";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, NavLink, Outlet, useLoaderData } from "@remix-run/react";
import { GeneralErrorBoundary } from "#app/components/error-boundary.tsx";
import { prisma } from "#app/utils/db.server.ts";
import { getUserImgSrc } from "#app/utils/misc.tsx";
import { useOptionalUser } from "#app/utils/user.ts";
import { PlusIcon } from "@radix-ui/react-icons";
import {
	Box,
	Button,
	Card,
	Container,
	Flex,
	Grid,
	ScrollArea,
	Stack,
	Title,
} from "@mantine/core";

export async function loader({ params }: LoaderFunctionArgs) {
	const owner = await prisma.user.findFirst({
		select: {
			id: true,
			name: true,
			username: true,
			image: { select: { id: true } },
			notes: { select: { id: true, title: true } },
		},
		where: { username: params.username },
	});

	invariantResponse(owner, "Owner not found", { status: 404 });

	return json({ owner });
}

export default function NotesRoute() {
	const data = useLoaderData<typeof loader>();
	const user = useOptionalUser();
	const isOwner = user?.id === data.owner.id;
	const ownerDisplayName = data.owner.name ?? data.owner.username;

	return (
		<Container size="xl" w="100%" pb="lg" mih="400px" h="100%" py="xl">
			<Card shadow="xl" radius="xl" h="100%">
				<Grid columns={4} w="100%" h="100%">
					<Grid.Col
						span={1}
						pos="relative"
						h="100%"
						className="bg-[var(--gray-3)] md:rounded-l-3xl"
					>
						<Flex direction="column" inset="0" pos="absolute">
							<Stack gap="xs" mb="xs" px="sm">
								<Flex
									direction={{ initial: "column", lg: "row" }}
									align="center"
									justify={{ initial: "center", lg: "start" }}
									gap={{ initial: "sm", lg: "md" }}
									pb="md"
									pl="xl"
									pr="md"
									pt="md"
								>
									<Link to={`/users/${data.owner.username}`}>
										<img
											src={getUserImgSrc(data.owner.image?.id)}
											alt={ownerDisplayName}
											className="h-16 w-16 rounded-full object-cover lg:h-24 lg:w-24"
										/>
										<Title
											order={1}
											ta={{
												base: "center",
												lg: "left",
											}}
										>
											{ownerDisplayName}'s Notes
										</Title>
									</Link>
								</Flex>
								{isOwner ? (
									<Button
										component={NavLink}
										leftSection={<PlusIcon />}
										to="new"
									>
										New Note
									</Button>
								) : null}
							</Stack>

							<Box>
								<Flex direction="column" gap="sm" px="sm">
									{data.owner.notes.map((note) => (
										<Button
											key={note.id}
											component={NavLink}
											to={note.id}
											preventScrollReset
											prefetch="intent"
										>
											{note.title}
										</Button>
									))}
								</Flex>
							</Box>
						</Flex>
					</Grid.Col>
					<Grid.Col
						pos="relative"
						span={3}
						className="bg-[var(--olive-2)] md:rounded-r-3xl"
					>
						<Outlet />
					</Grid.Col>
				</Grid>
			</Card>
		</Container>
	);
}

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
