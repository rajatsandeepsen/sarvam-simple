import { betterFetch, createFetch, createSchema } from "@better-fetch/fetch";
import { z } from "zod";

const speechToTextLanguageSchema = z.enum([
	"unknown",
	"hi-IN",
	"bn-IN",
	"kn-IN",
	"ml-IN",
	"mr-IN",
	"od-IN",
	"pa-IN",
	"ta-IN",
	"te-IN",
	"en-IN",
	"gu-IN",
	"as-IN",
	"ur-IN",
	"ne-IN",
	"kok-IN",
	"ks-IN",
	"sd-IN",
	"sa-IN",
	"sat-IN",
	"mni-IN",
	"brx-IN",
	"mai-IN",
	"doi-IN",
]);

const speechToTextModelSchema = z.enum(["saarika:v2.5", "saaras:v3"]);

const speechToTextModeSchema = z.enum([
	"transcribe",
	"translate",
	"verbatim",
	"translit",
	"codemix",
]);

const inputAudioCodecSchema = z.enum([
	"wav",
	"x-wav",
	"wave",
	"mp3",
	"mpeg",
	"mpeg3",
	"x-mp3",
	"x-mpeg-3",
	"aac",
	"x-aac",
	"aiff",
	"x-aiff",
	"ogg",
	"opus",
	"flac",
	"x-flac",
	"mp4",
	"x-m4a",
	"amr",
	"x-ms-wma",
	"webm",
	"pcm_s16le",
	"pcm_l16",
	"pcm_raw",
]);

const jobStateSchema = z.enum([
	"Accepted",
	"Pending",
	"Running",
	"Completed",
	"PartiallyCompleted",
	"Failed",
]);

const taskStateSchema = z.enum([
	"Success",
	"API Error",
	"Internal Server Error",
]);

const storageContainerTypeSchema = z.enum([
	"Azure",
	"Local",
	"Google",
	"Azure_V1",
]);

const fileRefSchema = z
	.object({
		file_name: z.string(),
		file_id: z.string(),
	})
	.passthrough();

const jobStatusOutputSchema = z
	.object({
		job_id: z.string(),
		job_state: jobStateSchema,
		created_at: z.string(),
		updated_at: z.string(),
		storage_container_type: storageContainerTypeSchema,
		total_files: z.number().int().nonnegative().default(0),
		successful_files_count: z.number().int().nonnegative().default(0),
		failed_files_count: z.number().int().nonnegative().default(0),
		error_message: z.string().default(""),
		job_details: z
			.array(
				z
					.object({
						inputs: z.array(fileRefSchema).default([]),
						outputs: z.array(fileRefSchema).default([]),
						state: taskStateSchema,
						error_message: z.string().nullable().optional(),
						exception_name: z.string().nullable().optional(),
					})
					.passthrough(),
			)
			.default([]),
	})
	.passthrough();

const signedUrlDetailSchema = z
	.object({
		file_url: z.string().url(),
		url: z.string().url().optional(),
		headers: z.record(z.string(), z.string()).optional(),
		file_metadata: z.record(z.string(), z.unknown()).nullish(),
	})
	.passthrough();

export const audioApiSchema = createSchema(
	{
		"": {
			method: "post",
			input: z.object({
				job_parameters: z
					.object({
						language_code: speechToTextLanguageSchema.optional(),
						model: speechToTextModelSchema.optional(),
						mode: speechToTextModeSchema.optional(),
						with_timestamps: z.boolean().optional(),
						with_diarization: z.boolean().optional(),
						num_speakers: z.number().int().positive().optional(),
						input_audio_codec: inputAudioCodecSchema.optional(),
					})
					.passthrough(),
				callback: z
					.object({
						url: z.string().url(),
						auth_token: z.string().optional(),
					})
					.optional(),
			}),
			output: z
				.object({
					job_id: z.string(),
					storage_container_type: storageContainerTypeSchema,
					job_parameters: z.record(z.string(), z.unknown()),
					job_state: jobStateSchema,
				})
				.passthrough(),
		},
		"/upload-files": {
			method: "post",
			input: z.object({
				job_id: z.string(),
				files: z.array(z.string()).min(1),
			}),
			output: z
				.object({
					job_id: z.string(),
					job_state: jobStateSchema,
					upload_urls: z.record(z.string(), signedUrlDetailSchema),
					storage_container_type: storageContainerTypeSchema,
				})
				.passthrough(),
		},
		"/:job_id/start": {
			method: "post",
			params: z.object({
				job_id: z.string(),
			}),
			output: jobStatusOutputSchema,
		},
		"/:job_id/status": {
			method: "get",
			params: z.object({
				job_id: z.string(),
			}),
			output: jobStatusOutputSchema,
		},
		"/download-files": {
			method: "post",
			input: z.object({
				job_id: z.string(),
				files: z.array(z.string()).min(1),
			}),
			output: z
				.object({
					job_id: z.string(),
					job_state: jobStateSchema,
					download_urls: z.record(z.string(), signedUrlDetailSchema),
					storage_container_type: storageContainerTypeSchema,
				})
				.passthrough(),
		},
	},
	{
		strict: true,
		baseURL: "/v1",
	},
);

export const createSarvamAudio = (
	apiKey: string,
	baseURL = "https://api.sarvam.ai/speech-to-text/job",
) => {
	return createFetch({
		baseURL,
		schema: audioApiSchema,
		headers: {
			"api-subscription-key": apiKey,
			"Content-Type": "application/json",
		},
		// disableValidation: true,
		onError: (error) => {
			console.error(error.error);
		},
	});
};

function _mimeType(filename: string): string {
	const ext = filename.split(".").pop()?.toLowerCase();
	switch (ext) {
		case "wav":
			return "audio/wav";
		case "mp3":
			return "audio/mpeg";
		case "m4a":
			return "audio/mp4";
		case "aac":
			return "audio/aac";
		case "ogg":
			return "audio/ogg";
		case "opus":
			return "audio/opus";
		case "flac":
			return "audio/flac";
		case "webm":
			return "audio/webm";
		case "amr":
			return "audio/amr";
		default:
			return "application/octet-stream";
	}
}

export async function uploadSingleFile(args: {
	uploadUrl: string;
	file: Buffer | Uint8Array | Blob;
	filename: string;
}): Promise<void> {
	const fileBlob =
		args.file instanceof Blob
			? args.file
			: new Blob([new Uint8Array(args.file)], {
					type: _mimeType(args.filename),
				});

	return await betterFetch(args.uploadUrl, {
		method: "PUT",
		headers: {
			"Content-Type": _mimeType(args.filename),
			"x-ms-blob-type": "BlockBlob",
		},
		body: fileBlob,
		throw: true,
	});
}
