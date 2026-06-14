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
import { visionAPI } from "@/hooks/api";
import { MutationRenderer } from "@/hooks/mutation";
import { truncateText } from "@/lib/utils";
import {
	documentIntelligenceLanguageSchema,
	outputFormatSchema,
} from "@/sarvam/vision/api";

const VISION_ACCEPT =
	".pdf,.png,.jpg,.jpeg,.zip,application/pdf,image/png,image/jpeg,application/zip";

const VISION_LANGUAGE_OPTIONS = documentIntelligenceLanguageSchema.options;
const VISION_OUTPUT_FORMAT_OPTIONS = outputFormatSchema.options;

export default function Home() {
	return (
		<Container>
			<Card>
				<CardHeader>
					<CardTitle>Drop You PDF/Image Files Here</CardTitle>
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
	const [language, setLanguage] = useState<string>("en-IN");
	const [outputFormat, setOutputFormat] = useState<string>("md");

	const mutation = useMutation(
		(
			(id ? visionAPI[":id"] : visionAPI) as (typeof visionAPI)[":id"]
		).upload.$post.mutationOptions({
			async onSuccess(data) {
				router.push(`/vision/job?id=${data.id}`);
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
			accept={VISION_ACCEPT}
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
									description="Or click to browse (PDF, PNG, JPG, JPEG, ZIP)"
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
										<Input
											type="email"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											placeholder="name@example.com"
										/>
									</Field>

									<FieldGroup className="grid gap-3 md:grid-cols-2">
										<Field>
											<FieldLabel>Language</FieldLabel>
											<FieldContent>
												<Select
													value={language}
													onValueChange={(value) =>
														setLanguage(
															value as (typeof VISION_LANGUAGE_OPTIONS)[number],
														)
													}
												>
													<SelectTrigger className="w-full">
														<SelectValue placeholder="Select language" />
													</SelectTrigger>
													<SelectContent>
														{VISION_LANGUAGE_OPTIONS.map((option) => (
															<SelectItem key={option} value={option}>
																{option}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</FieldContent>
										</Field>
										<Field>
											<FieldLabel>Output format</FieldLabel>
											<FieldContent>
												<Select
													value={outputFormat}
													onValueChange={(value) =>
														setOutputFormat(
															value as (typeof VISION_OUTPUT_FORMAT_OPTIONS)[number],
														)
													}
												>
													<SelectTrigger className="w-full">
														<SelectValue placeholder="Select output format" />
													</SelectTrigger>
													<SelectContent>
														{VISION_OUTPUT_FORMAT_OPTIONS.map((option) => (
															<SelectItem key={option} value={option}>
																{option}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</FieldContent>
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
													language,
													output_format: outputFormat,
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
