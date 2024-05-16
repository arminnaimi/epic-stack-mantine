import type { MetaFunction } from "@remix-run/react";
import type { loader as notesLoader } from "./notes.tsx";
import { Box, Container, Text } from "@radix-ui/themes";

export default function NotesIndexRoute() {
	return (
		<Container>
			<Box pt="4" pl="4">
				<Text size="5">Select a note</Text>
			</Box>
		</Container>
	);
}

export const meta: MetaFunction<
	null,
	{ "routes/users+/$username_+/notes": typeof notesLoader }
> = ({ params, matches }) => {
	const notesMatch = matches.find(
		(m) => m.id === "routes/users+/$username_+/notes",
	);
	const displayName = notesMatch?.data?.owner.name ?? params.username;
	const noteCount = notesMatch?.data?.owner.notes.length ?? 0;
	const notesText = noteCount === 1 ? "note" : "notes";
	return [
		{ title: `${displayName}'s Notes | Epic Notes` },
		{
			name: "description",
			content: `Checkout ${displayName}'s ${noteCount} ${notesText} on Epic Notes`,
		},
	];
};
