import { Text } from "@mantine/core";

export type ListOfErrors = Array<string | null | undefined> | null | undefined;

export function ErrorList({
	id,
	errors,
}: {
	errors?: ListOfErrors;
	id?: string;
}) {
	const errorsToRender = errors?.filter(Boolean);
	if (!errorsToRender?.length) return null;
	return (
		<ul id={id} className="flex flex-col gap-1">
			{errorsToRender.map((e) => (
				<li key={e}>
					<Text component="span" c="red" size="xs">
						{e}
					</Text>
				</li>
			))}
		</ul>
	);
}
