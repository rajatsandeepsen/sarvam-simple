"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2Icon, LoaderIcon, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Container } from "@/components/container";
import { FileUploadDropzoneContent } from "@/components/file-upload-dropzone-content";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldContent,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import {
	FileUpload,
	FileUploadDropzone,
	FileUploadItem,
	FileUploadItemDelete,
	FileUploadItemMetadata,
	FileUploadItemPreview,
	FileUploadList,
	FileUploadTrigger,
} from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { audioAPI } from "@/hooks/api";
import { MutationRenderer } from "@/hooks/mutation";
import { truncateText } from "@/lib/utils";
import {
	speechToTextLanguageSchema,
	speechToTextModeSchema,
} from "@/sarvam/audio/api";

const AUDIO_ACCEPT =
	".wav,.mp3,.m4a,.aac,.ogg,.opus,.flac,.webm,.amr,audio/wav,audio/mpeg,audio/mp4,audio/aac,audio/ogg,audio/opus,audio/flac,audio/webm,audio/amr";

const AUDIO_LANGUAGE_OPTIONS = speechToTextLanguageSchema.options.filter(
	(option) => option !== "unknown",
);
const AUDIO_MODE_OPTIONS = speechToTextModeSchema.options;

export default function Home() {
	return (
		<Container>
			<Card>
				<CardHeader>
					<CardTitle>Drop You Audio Files Here</CardTitle>
				</CardHeader>
				<FileUploadComponent />
			</Card>
		</Container>
	);
}
export function FileUploadComponent() {
	const id = useSearchParams().get("id");
	const router = useRouter();
	const [files, setFiles] = useState<File[]>([]);
	const [email, setEmail] = useState("");
	const [languageCode, setLanguageCode] = useState<string>("en-IN");
	const [mode, setMode] = useState<string>("transcribe");
	const [withTimestamps, setWithTimestamps] = useState(false);
	const [withDiarization, setWithDiarization] = useState(false);

	const mutation = useMutation(
		(
			(id ? audioAPI[":id"] : audioAPI) as (typeof audioAPI)[":id"]
		).upload.$post.mutationOptions({
			async onSuccess(data) {
				router.push(`/audio/job?id=${data.id}`);
			},
		}),
	);

	const onFileReject = useCallback((file: File, message: string) => {
		toast(message, {
			description: `"${truncateText(file.name, 20)}" has been rejected`,
		});
	}, []);

	return (
		<FileUpload
			accept={AUDIO_ACCEPT}
			maxFiles={2}
			maxSize={5 * 1024 * 1024}
			value={files}
			onValueChange={setFiles}
			multiple
			onFileReject={onFileReject}
		>
			<MutationRenderer
				useMutate={mutation}
				mutate={(mutate) => (
					<>
						<CardContent className="space-y-3">
							<FileUploadDropzone>
								<FileUploadDropzoneContent
									title="Drag & drop files here"
									description="Or click to browse (WAV, MP3, M4A, AAC, OGG, OPUS, FLAC, WEBM, AMR)"
									subtitle="max 2 files, up to 5MB each"
								>
									<FileUploadTrigger asChild>
										<Button variant="outline" size="sm" className="mt-2 w-fit">
											Browse files
										</Button>
									</FileUploadTrigger>
								</FileUploadDropzoneContent>
							</FileUploadDropzone>
							{files.length > 0 && (
								<>
									<Field>
										<FieldLabel>Email for notifications (optional)</FieldLabel>
										<FieldContent>
											<Input
												type="email"
												value={email}
												onChange={(e) => setEmail(e.target.value)}
												placeholder="name@example.com"
											/>
										</FieldContent>
									</Field>
									<FieldGroup className="grid gap-3 md:grid-cols-2">
										<Field>
											<FieldLabel>Language</FieldLabel>
											<FieldContent>
												<Select
													value={languageCode}
													onValueChange={(value) =>
														setLanguageCode(
															value as (typeof AUDIO_LANGUAGE_OPTIONS)[number],
														)
													}
												>
													<SelectTrigger className="w-full">
														<SelectValue placeholder="Select language" />
													</SelectTrigger>
													<SelectContent>
														{AUDIO_LANGUAGE_OPTIONS.map((option) => (
															<SelectItem key={option} value={option}>
																{option}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</FieldContent>
										</Field>
										<Field>
											<FieldLabel>Mode</FieldLabel>
											<FieldContent>
												<Select
													value={mode}
													onValueChange={(value) =>
														setMode(
															value as (typeof AUDIO_MODE_OPTIONS)[number],
														)
													}
												>
													<SelectTrigger className="w-full">
														<SelectValue placeholder="Select mode" />
													</SelectTrigger>
													<SelectContent>
														{AUDIO_MODE_OPTIONS.map((option) => (
															<SelectItem key={option} value={option}>
																{option}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</FieldContent>
										</Field>
									</FieldGroup>
									<FieldGroup>
										<Field orientation="horizontal">
											<Checkbox
												id="audio-with-timestamps"
												checked={withTimestamps}
												onCheckedChange={(checked) =>
													setWithTimestamps(checked === true)
												}
											/>
											<FieldLabel htmlFor="audio-with-timestamps">
												With timestamps
											</FieldLabel>
										</Field>
										<Field orientation="horizontal">
											<Checkbox
												id="audio-with-diarization"
												checked={withDiarization}
												onCheckedChange={(checked) =>
													setWithDiarization(checked === true)
												}
											/>
											<FieldLabel htmlFor="audio-with-diarization">
												With diarization
											</FieldLabel>
										</Field>
									</FieldGroup>
								</>
							)}
							<FileUploadList>
								{files.map((file, index) => (
									<FileUploadItem
										key={`${index as number}-${file.name}`}
										value={file}
									>
										<FileUploadItemPreview />
										<FileUploadItemMetadata />
										<FileUploadItemDelete asChild>
											<Button variant="ghost" size="icon" className="size-7">
												<X />
											</Button>
										</FileUploadItemDelete>
									</FileUploadItem>
								))}
							</FileUploadList>
						</CardContent>
						<CardFooter className="justify-between gap-4">
							{files.length > 0 && (
								<Button variant={"secondary"}>Clear All</Button>
							)}

							<Button
								disabled={files.length === 0}
								onClick={() => {
									mutate({
										param: { id: id ?? "" },
										form: id
											? {
													file: files,
													...(email.trim() ? { email: email.trim() } : {}),
												}
											: {
													file: files,
													...(email.trim() ? { email: email.trim() } : {}),
													language_code: languageCode,
													mode,
													with_timestamps: String(withTimestamps),
													with_diarization: String(withDiarization),
												},
									} as never);
								}}
							>
								Upload and Start Processing
							</Button>
						</CardFooter>
					</>
				)}
				isPending={
					<>
						<CardContent>
							<FileUploadList>
								{files.map((file, index) => (
									<FileUploadItem
										key={`${index as number}-${file.name}`}
										value={file}
									>
										<FileUploadItemPreview />
										<FileUploadItemMetadata />
										<Button variant="ghost" size="icon" className="size-7">
											<LoaderIcon className="animate-spin" />
										</Button>
									</FileUploadItem>
								))}
							</FileUploadList>
						</CardContent>
						<CardFooter className="justify-between gap-4">
							<Button disabled>Creating Job</Button>
						</CardFooter>
					</>
				}
				isSuccess={
					<>
						<CardContent>
							<FileUploadList>
								{files.map((file, index) => (
									<FileUploadItem
										key={`${index as number}-${file.name}`}
										value={file}
									>
										<FileUploadItemPreview />
										<FileUploadItemMetadata />
										<Button variant="ghost" size="icon" className="size-7">
											<Loader2Icon className="animate-spin" />
										</Button>
									</FileUploadItem>
								))}
							</FileUploadList>
						</CardContent>
						<CardFooter className="justify-between gap-4">
							<Button disabled>Uploading Files</Button>
						</CardFooter>
					</>
				}
			/>
		</FileUpload>
	);
}
