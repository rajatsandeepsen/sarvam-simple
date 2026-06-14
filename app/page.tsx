"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2Icon, LoaderIcon, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Container } from "@/components/container";
import { FileUploadDropzoneContent } from "@/components/file-upload-dropzone-content";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
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
import { audioAPI, visionAPI } from "@/hooks/api";
import { truncateText } from "@/lib/utils";
import {
	speechToTextLanguageSchema,
	speechToTextModeSchema,
} from "@/sarvam/audio/api";
import {
	documentIntelligenceLanguageSchema,
	outputFormatSchema,
} from "@/sarvam/vision/api";

const VISION_ACCEPT =
	".pdf,.png,.jpg,.jpeg,.zip,application/pdf,image/png,image/jpeg,application/zip";

const AUDIO_ACCEPT =
	".wav,.mp3,.m4a,.aac,.ogg,.opus,.flac,.webm,.amr,audio/wav,audio/mpeg,audio/mp4,audio/aac,audio/ogg,audio/opus,audio/flac,audio/webm,audio/amr";

const SMART_ACCEPT = `${VISION_ACCEPT},${AUDIO_ACCEPT}`;

type AudioLanguageOption = Exclude<
	(typeof speechToTextLanguageSchema)["options"][number],
	"unknown"
>;
type AudioModeOption = (typeof speechToTextModeSchema)["options"][number];
type VisionLanguageOption =
	(typeof documentIntelligenceLanguageSchema)["options"][number];
type VisionOutputFormatOption = (typeof outputFormatSchema)["options"][number];

const AUDIO_LANGUAGE_OPTIONS = speechToTextLanguageSchema.options.filter(
	(option): option is AudioLanguageOption => option !== "unknown",
);
const AUDIO_MODE_OPTIONS = speechToTextModeSchema.options;
const VISION_LANGUAGE_OPTIONS = documentIntelligenceLanguageSchema.options;
const VISION_OUTPUT_FORMAT_OPTIONS = outputFormatSchema.options;

type InputMode = "audio" | "vision" | null;

const AUDIO_EXTENSIONS = new Set([
	"wav",
	"mp3",
	"m4a",
	"aac",
	"ogg",
	"opus",
	"flac",
	"webm",
	"amr",
]);

const VISION_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg", "zip"]);

function inferMode(file: File): InputMode {
	const extension = file.name.split(".").pop()?.toLowerCase();
	const mimeType = file.type.toLowerCase();

	if (
		mimeType.startsWith("audio/") ||
		(extension && AUDIO_EXTENSIONS.has(extension))
	) {
		return "audio";
	}

	if (
		mimeType === "application/pdf" ||
		mimeType.startsWith("image/") ||
		mimeType === "application/zip" ||
		(extension && VISION_EXTENSIONS.has(extension))
	) {
		return "vision";
	}

	return null;
}

export default function HomePage() {
	const router = useRouter();
	const [files, setFiles] = useState<File[]>([]);
	const [email, setEmail] = useState("");
	const [audioLanguageCode, setAudioLanguageCode] =
		useState<AudioLanguageOption>("en-IN");
	const [audioMode, setAudioMode] = useState<AudioModeOption>("transcribe");
	const [withTimestamps, setWithTimestamps] = useState(false);
	const [withDiarization, setWithDiarization] = useState(false);
	const [visionLanguage, setVisionLanguage] =
		useState<VisionLanguageOption>("en-IN");
	const [visionOutputFormat, setVisionOutputFormat] =
		useState<VisionOutputFormatOption>("md");

	const audioMutation = useMutation(
		audioAPI.upload.$post.mutationOptions({
			async onSuccess(data) {
				router.push(`/audio/job?id=${data.id}`);
			},
		}),
	);

	const visionMutation = useMutation(
		visionAPI.upload.$post.mutationOptions({
			async onSuccess(data) {
				router.push(`/vision/job?id=${data.id}`);
			},
		}),
	);

	const activeMode = useMemo(() => {
		if (files.length === 0) return null;
		return inferMode(files[0]);
	}, [files]);

	const isUploading = audioMutation.isPending || visionMutation.isPending;
	const isUploaded = audioMutation.isSuccess || visionMutation.isSuccess;
	const effectiveAccept =
		activeMode === "audio"
			? AUDIO_ACCEPT
			: activeMode === "vision"
				? VISION_ACCEPT
				: SMART_ACCEPT;

	const onFileReject = useCallback((file: File, message: string) => {
		toast(message, {
			description: `"${truncateText(file.name, 20)}" has been rejected`,
		});
	}, []);

	const hasMixedTypes = useCallback((selectedFiles: File[]) => {
		if (selectedFiles.length <= 1) return false;
		const firstMode = inferMode(selectedFiles[0]);
		if (!firstMode) return true;
		return selectedFiles.some((file) => inferMode(file) !== firstMode);
	}, []);

	const onValueChange = useCallback(
		(nextFiles: File[]) => {
			if (nextFiles.length === 0) {
				setFiles([]);
				return;
			}

			const currentMode = files.length > 0 ? inferMode(files[0]) : null;
			const nextMode = inferMode(nextFiles[0]);

			if (currentMode && nextMode && currentMode !== nextMode) {
				toast.error("Cannot switch file type in same batch", {
					description: "Clear current files first, then upload another type.",
				});
				return;
			}

			if (hasMixedTypes(nextFiles)) {
				toast.error("Mixed file types are not allowed", {
					description:
						"Drop either only audio files or only vision files in one batch.",
				});
				return;
			}

			setFiles(nextFiles);
		},
		[files, hasMixedTypes],
	);

	const onSmartUpload = useCallback(() => {
		if (files.length === 0) return;

		const firstMode = inferMode(files[0]);
		if (!firstMode) {
			toast.error("Unsupported file type", {
				description: "Please upload an audio file or a vision-supported file.",
			});
			return;
		}

		if (hasMixedTypes(files)) {
			toast.error("Mixed file types are not allowed", {
				description:
					"Please upload either only audio files or only vision files.",
			});
			return;
		}

		if (firstMode === "audio") {
			audioMutation.mutate({
				form: {
					file: files,
					...(email.trim() ? { email: email.trim() } : {}),
					language_code: audioLanguageCode,
					mode: audioMode,
					with_timestamps: String(withTimestamps),
					with_diarization: String(withDiarization),
				},
			});
			return;
		}

		visionMutation.mutate({
			form: {
				file: files,
				...(email.trim() ? { email: email.trim() } : {}),
				language: visionLanguage,
				output_format: visionOutputFormat,
			},
		});
	}, [
		audioLanguageCode,
		audioMode,
		audioMutation,
		email,
		files,
		hasMixedTypes,
		visionLanguage,
		visionMutation,
		visionOutputFormat,
		withDiarization,
		withTimestamps,
	]);

	return (
		<Container className="flex flex-col items-center space-y-4">
			<Card className="w-md">
				<CardHeader>
					<CardTitle>Simple Sarvam</CardTitle>
					<CardDescription>
						Bulk process your files using Sarvam AI batch API in serverless
						environment
					</CardDescription>
					<CardDescription>
						Just deploy to any serverless javascript worker
					</CardDescription>
				</CardHeader>

				<FileUpload
					accept={effectiveAccept}
					maxFiles={2}
					maxSize={5 * 1024 * 1024}
					value={files}
					onValueChange={onValueChange}
					multiple
					onFileReject={onFileReject}
				>
					<CardContent className="space-y-3">
						<FileUploadDropzone>
							<FileUploadDropzoneContent
								title="Drag & drop files here"
								description="max 2 files, up to 5MB each"
								subtitle={
									activeMode === "audio"
										? "Locked to audio files (clear to switch)"
										: activeMode === "vision"
											? "Locked to vision files (clear to switch)"
											: "supports both audio & vision files"
								}
							>
								<FileUploadTrigger asChild>
									<Button variant="outline" size="sm" className="mt-2 w-fit">
										Browse files
									</Button>
								</FileUploadTrigger>
							</FileUploadDropzoneContent>
						</FileUploadDropzone>

						{files.length > 0 && (
							<Field>
								<FieldLabel>Email for notifications (optional)</FieldLabel>
								<Input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="name@example.com"
								/>
							</Field>
						)}

						{files.length > 0 && activeMode !== "vision" && (
							<>
								<FieldGroup className="grid gap-3 md:grid-cols-2">
									<Field>
										<FieldLabel>Language</FieldLabel>
										<FieldContent>
											<Select
												value={audioLanguageCode}
												onValueChange={(value) =>
													setAudioLanguageCode(
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
												value={audioMode}
												onValueChange={(value) =>
													setAudioMode(
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
											id="home-audio-with-timestamps"
											checked={withTimestamps}
											onCheckedChange={(checked) =>
												setWithTimestamps(checked === true)
											}
										/>
										<FieldLabel htmlFor="home-audio-with-timestamps">
											With timestamps
										</FieldLabel>
									</Field>
									<Field orientation="horizontal">
										<Checkbox
											id="home-audio-with-diarization"
											checked={withDiarization}
											onCheckedChange={(checked) =>
												setWithDiarization(checked === true)
											}
										/>
										<FieldLabel htmlFor="home-audio-with-diarization">
											With diarization
										</FieldLabel>
									</Field>
								</FieldGroup>
							</>
						)}

						{files.length > 0 && activeMode !== "audio" && (
							<FieldGroup className="grid gap-3 md:grid-cols-2">
								<Field>
									<FieldLabel>Language</FieldLabel>
									<FieldContent>
										<Select
											value={visionLanguage}
											onValueChange={(value) =>
												setVisionLanguage(
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
											value={visionOutputFormat}
											onValueChange={(value) =>
												setVisionOutputFormat(
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
						)}

						<FileUploadList>
							{files.map((file, index) => (
								<FileUploadItem
									key={`${index as number}-${file.name}`}
									value={file}
								>
									<FileUploadItemPreview />
									<FileUploadItemMetadata />
									{isUploading || isUploaded ? (
										<Button variant="ghost" size="icon" className="size-7">
											{isUploading ? (
												<LoaderIcon className="animate-spin" />
											) : (
												<Loader2Icon className="animate-spin" />
											)}
										</Button>
									) : (
										<FileUploadItemDelete asChild>
											<Button variant="ghost" size="icon" className="size-7">
												<X />
											</Button>
										</FileUploadItemDelete>
									)}
								</FileUploadItem>
							))}
						</FileUploadList>
					</CardContent>

					<CardFooter>
						<Button
							disabled={files.length === 0 || isUploading}
							onClick={onSmartUpload}
						>
							{isUploading
								? "Creating Job"
								: activeMode === "audio"
									? "Upload Audio Files and Start Processing"
									: activeMode === "vision"
										? "Upload Vision Files and Start Processing"
										: "Upload and Start Processing"}
						</Button>
					</CardFooter>
				</FileUpload>
			</Card>
			<Card className="w-min">
				<CardFooter className="flex flex-row justify-between gap-4">
					<Button className="grow" asChild>
						<Link href="/vision">Use Vision Specific</Link>
					</Button>
					<Button className="grow" asChild>
						<Link href="/audio">Use Audio Specific</Link>
					</Button>
				</CardFooter>
			</Card>
		</Container>
	);
}
