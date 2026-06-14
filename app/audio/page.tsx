"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2Icon, LoaderIcon, Upload, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Container } from "@/components/container";
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
import { Label } from "@/components/ui/label";
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

const AUDIO_ACCEPT =
	".wav,.mp3,.m4a,.aac,.ogg,.opus,.flac,.webm,.amr,audio/wav,audio/mpeg,audio/mp4,audio/aac,audio/ogg,audio/opus,audio/flac,audio/webm,audio/amr";

const AUDIO_LANGUAGE_OPTIONS = ["en-IN", "hi-IN", "ta-IN", "te-IN"] as const;
const AUDIO_MODE_OPTIONS = [
	"transcribe",
	"translate",
	"verbatim",
	"translit",
	"codemix",
] as const;

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
	const [languageCode, setLanguageCode] =
		useState<(typeof AUDIO_LANGUAGE_OPTIONS)[number]>("en-IN");
	const [mode, setMode] =
		useState<(typeof AUDIO_MODE_OPTIONS)[number]>("transcribe");
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
								<div className="flex flex-col items-center gap-1 text-center">
									<div className="flex items-center justify-center rounded-full border p-2.5">
										<Upload className="size-6 text-muted-foreground" />
									</div>
									<p className="font-medium text-sm">Drag & drop files here</p>
									<p className="text-muted-foreground text-xs">
										Or click to browse (WAV, MP3, M4A, AAC, OGG, OPUS, FLAC,
										WEBM, AMR · max 2 files, up to 5MB each)
									</p>
								</div>
								<FileUploadTrigger asChild>
									<Button variant="outline" size="sm" className="mt-2 w-fit">
										Browse files
									</Button>
								</FileUploadTrigger>
							</FileUploadDropzone>
							{files.length > 0 && (
								<>
									<Input
										type="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										placeholder="Email (optional)"
									/>
									<div className="grid gap-3 md:grid-cols-2">
										<div className="space-y-2">
											<Label>Language</Label>
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
										</div>
										<div className="space-y-2">
											<Label>Mode</Label>
											<Select
												value={mode}
												onValueChange={(value) =>
													setMode(value as (typeof AUDIO_MODE_OPTIONS)[number])
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
										</div>
									</div>
									<div className="flex flex-col gap-2">
										<Label className="flex items-center gap-2 font-normal">
											<Checkbox
												checked={withTimestamps}
												onCheckedChange={(checked) =>
													setWithTimestamps(checked === true)
												}
											/>
											With timestamps
										</Label>
										<Label className="flex items-center gap-2 font-normal">
											<Checkbox
												checked={withDiarization}
												onCheckedChange={(checked) =>
													setWithDiarization(checked === true)
												}
											/>
											With diarization
										</Label>
									</div>
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
