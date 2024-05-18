import {
	FormProvider,
	getFieldsetProps,
	getFormProps,
	getInputProps,
	getTextareaProps,
	useForm,
	type FieldMetadata,
} from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import type { Note, NoteImage } from "@prisma/client";
import type { SerializeFrom } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import { useState } from "react";
import { z } from "zod";
import { GeneralErrorBoundary } from "#app/components/error-boundary.tsx";
import { ErrorList } from "#app/components/forms.tsx";
import { cn, getNoteImgSrc, useIsPending } from "#app/utils/misc.tsx";
import type { action } from "./__note-editor.server";
import {
	Box,
	Button,
	Flex,
	ActionIcon,
	ScrollArea,
	Textarea,
	TextInput,
	Text,
	Stack,
} from "@mantine/core";
import { Cross1Icon, PlusIcon } from "@radix-ui/react-icons";

const titleMinLength = 1;
const titleMaxLength = 100;
const contentMinLength = 1;
const contentMaxLength = 10000;

export const MAX_UPLOAD_SIZE = 1024 * 1024 * 3; // 3MB

const ImageFieldsetSchema = z.object({
	id: z.string().optional(),
	file: z
		.instanceof(File)
		.optional()
		.refine((file) => {
			return !file || file.size <= MAX_UPLOAD_SIZE;
		}, "File size must be less than 3MB"),
	altText: z.string().optional(),
});

export type ImageFieldset = z.infer<typeof ImageFieldsetSchema>;

export const NoteEditorSchema = z.object({
	id: z.string().optional(),
	title: z.string().min(titleMinLength).max(titleMaxLength),
	content: z.string().min(contentMinLength).max(contentMaxLength),
	images: z.array(ImageFieldsetSchema).max(5).optional(),
});

export function NoteEditor({
	note,
}: {
	note?: SerializeFrom<
		Pick<Note, "id" | "title" | "content"> & {
			images: Array<Pick<NoteImage, "id" | "altText">>;
		}
	>;
}) {
	const actionData = useActionData<typeof action>();
	const isPending = useIsPending();

	const [form, fields] = useForm({
		id: "note-editor",
		constraint: getZodConstraint(NoteEditorSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: NoteEditorSchema });
		},
		defaultValue: {
			...note,
			images: note?.images ?? [{}],
		},
		shouldRevalidate: "onBlur",
	});
	const imageList = fields.images.getFieldList();

	return (
		<FormProvider context={form.context}>
			<Flex direction="column" gap="sm" h="100%" justify="space-between">
				<ScrollArea.Autosize mah={500} scrollbars="y">
					<Box p="4">
						<Form
							method="POST"
							{...getFormProps(form)}
							encType="multipart/form-data"
						>
							{/*
					This hidden submit button is here to ensure that when the user hits
					"enter" on an input field, the primary form function is submitted
					rather than the first button in the form (which is delete/add image).
				*/}
							<button type="submit" className="hidden" />
							{note ? <input type="hidden" name="id" value={note.id} /> : null}
							<Flex direction="column" gap="xs">
								<TextInput
									label="Title"
									error={fields.title.errors}
									autoFocus={true}
									{...getInputProps(fields.title, { type: "text" })}
								/>
								<Textarea
									label="Content"
									error={fields.content.errors}
									{...getTextareaProps(fields.content)}
								/>
								<Box>
									<Text component="label">Images</Text>
									<Stack gap="md">
										{imageList.map((image, index) => {
											return (
												<Flex direction="column" align="end" key={image.key}>
													<ActionIcon
														color="red"
														{...form.remove.getButtonProps({
															name: fields.images.name,
															index,
														})}
													>
														<span aria-hidden>
															<Cross1Icon />
														</span>{" "}
														<span className="sr-only">
															Remove image {index + 1}
														</span>
													</ActionIcon>
													<ImageChooser meta={image} />
												</Flex>
											);
										})}
									</Stack>
								</Box>
								<Button
									leftSection={<PlusIcon />}
									{...form.insert.getButtonProps({ name: fields.images.name })}
								>
									Image
									<span className="sr-only">Add image</span>
								</Button>
							</Flex>
							<ErrorList id={form.errorId} errors={form.errors} />
						</Form>
					</Box>
				</ScrollArea.Autosize>
				<Flex justify="end" gap="sm" p="md">
					<Button color="red" {...form.reset.getButtonProps()}>
						Reset
					</Button>
					<Button
						form={form.id}
						type="submit"
						disabled={isPending}
						loading={isPending}
					>
						Submit
					</Button>
				</Flex>
			</Flex>
		</FormProvider>
	);
}

function ImageChooser({ meta }: { meta: FieldMetadata<ImageFieldset> }) {
	const fields = meta.getFieldset();
	const existingImage = Boolean(fields.id.initialValue);
	const [previewImage, setPreviewImage] = useState<string | null>(
		fields.id.initialValue ? getNoteImgSrc(fields.id.initialValue) : null,
	);
	const [altText, setAltText] = useState(fields.altText.initialValue ?? "");

	return (
		<fieldset {...getFieldsetProps(meta)}>
			<Flex gap="sm">
				<Box className="w-32">
					<Box pos="relative" className="h-32 w-32">
						<label
							htmlFor={fields.file.id}
							className={cn("group absolute h-32 w-32 rounded-lg", {
								"bg-accent opacity-40 focus-within:opacity-100 hover:opacity-100":
									!previewImage,
								"cursor-pointer focus-within:ring-2": !existingImage,
							})}
						>
							{previewImage ? (
								<div className="relative">
									<img
										src={previewImage}
										alt={altText ?? ""}
										className="h-32 w-32 rounded-lg object-cover"
									/>
									{existingImage ? null : (
										<div className="pointer-events-none absolute -right-0.5 -top-0.5 rotate-12 rounded-sm bg-secondary px-2 py-1 text-xs text-secondary-foreground shadow-md">
											new
										</div>
									)}
								</div>
							) : (
								<div className="flex h-32 w-32 items-center justify-center rounded-lg border border-muted-foreground text-4xl text-muted-foreground">
									<PlusIcon />
								</div>
							)}
							{existingImage ? (
								<input {...getInputProps(fields.id, { type: "hidden" })} />
							) : null}
							<input
								aria-label="Image"
								className="absolute left-0 top-0 z-0 h-32 w-32 cursor-pointer opacity-0"
								onChange={(event) => {
									const file = event.target.files?.[0];

									if (file) {
										const reader = new FileReader();
										reader.onloadend = () => {
											setPreviewImage(reader.result as string);
										};
										reader.readAsDataURL(file);
									} else {
										setPreviewImage(null);
									}
								}}
								accept="image/*"
								{...getInputProps(fields.file, { type: "file" })}
							/>
						</label>
					</Box>
					<Box mih="32px" px="md" pb="sm" pt="xs">
						<ErrorList id={fields.file.errorId} errors={fields.file.errors} />
					</Box>
				</Box>
				<Box>
					{/* <Label htmlFor={fields.altText.id}>Alt Text</Label> */}
					<Textarea
						error={fields.altText.errors}
						onChange={(e) => setAltText(e.currentTarget.value)}
						{...getTextareaProps(fields.altText)}
					/>
				</Box>
			</Flex>
			<Box mih="32px" px="md" pb="sm" pt="xs">
				<ErrorList id={meta.errorId} errors={meta.errors} />
			</Box>
		</fieldset>
	);
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<p>No note with the id "{params.noteId}" exists</p>
				),
			}}
		/>
	);
}
