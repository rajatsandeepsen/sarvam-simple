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
import { audioAPI } from "@/hooks/api";
import { MutationRenderer } from "@/hooks/mutation";
import { truncateText } from "@/lib/utils";

const AUDIO_ACCEPT =
	".wav,.mp3,.m4a,.aac,.ogg,.opus,.flac,.webm,.amr,audio/wav,audio/mpeg,audio/mp4,audio/aac,audio/ogg,audio/opus,audio/flac,audio/webm,audio/amr";

export default function Home() {
	return (
		<Container>
			<Card>
				<CardHeader>
					<CardTitle>Drop You Files Here</CardTitle>
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
	const [email, setEmail] = useState();

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
							<Input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="Email (optional)"
							/>
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
										form: {
											file: files,
											...(email.trim() ? { email: email.trim() } : {}),
										},
									});
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
