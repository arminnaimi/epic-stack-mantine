import { Form, useSearchParams, useSubmit } from "@remix-run/react";
import { useId } from "react";
import { useDebounce, useIsPending } from "#app/utils/misc.tsx";
import { ActionIcon, TextInput } from "@mantine/core";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";

export function SearchBar({
	status,
	autoFocus = false,
	autoSubmit = false,
}: {
	status: "idle" | "pending" | "success" | "error";
	autoFocus?: boolean;
	autoSubmit?: boolean;
}) {
	const id = useId();
	const [searchParams] = useSearchParams();
	const submit = useSubmit();
	const isSubmitting = useIsPending({
		formMethod: "GET",
		formAction: "/users",
	});

	const handleFormChange = useDebounce((form: HTMLFormElement) => {
		submit(form);
	}, 400);

	return (
		<Form
			method="GET"
			action="/users"
			className="flex flex-wrap items-center justify-center gap-2"
			onChange={(e) => autoSubmit && handleFormChange(e.currentTarget)}
		>
			<TextInput
				autoComplete="off"
				rightSection={
					<ActionIcon type="submit" loading={isSubmitting}>
						<MagnifyingGlassIcon />
					</ActionIcon>
				}
				type="search"
				name="search"
				id={id}
				defaultValue={searchParams.get("search") ?? ""}
				placeholder="Search"
				autoFocus={autoFocus}
			/>
		</Form>
	);
}
