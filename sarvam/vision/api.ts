import { betterFetch, createFetch, createSchema } from "@better-fetch/fetch";
import { z } from "zod";

const documentIntelligenceLanguageSchema = z.enum([
	"hi-IN",
	"en-IN",
	"bn-IN",
	"gu-IN",
	"kn-IN",
	"ml-IN",
	"mr-IN",
	"or-IN",
	"pa-IN",
	"ta-IN",
	"te-IN",
	"ur-IN",
	"as-IN",
	"bodo-IN",
	"doi-IN",
	"ks-IN",
	"kok-IN",
	"mai-IN",
	"mni-IN",
	"ne-IN",
	"sa-IN",
	"sat-IN",
	"sd-IN",
]);

const outputFormatSchema = z.enum(["html", "md", "json"]);

const jobStateSchema = z.enum([
	"Accepted",
	"Pending",
	"Running",
	"Completed",
	"PartiallyCompleted",
	"Failed",
]);

const storageContainerTypeSchema = z.string();

const fileRefSchema = z
	.object({
		file_name: z.string(),
		file_id: z.string(),
	})
	.passthrough();

const pageErrorSchema = z
	.object({
		page_number: z.number().int().nonnegative().optional(),
		error_code: z.string().nullable().optional(),
		error_message: z.string().optional(),
	})
	.passthrough();

const jobDetailSchema = z
	.object({
		inputs: z.array(fileRefSchema).default([]),
		outputs: z.array(fileRefSchema).default([]),
		state: z.string(),
		total_pages: z.number().int().nonnegative().default(0),
		pages_processed: z.number().int().nonnegative().default(0),
		pages_succeeded: z.number().int().nonnegative().default(0),
		pages_failed: z.number().int().nonnegative().default(0),
		error_message: z.string().default(""),
		error_code: z.string().nullable().default(null),
		page_errors: z.array(pageErrorSchema).default([]),
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
		job_details: z.array(jobDetailSchema).default([]),
	})
	.passthrough();

export const visionApiSchema = createSchema(
	{
		"": {
			method: "post",
			input: z.object({
				job_parameters: z.object({
					language: documentIntelligenceLanguageSchema.optional(),
					output_format: outputFormatSchema.optional(),
				}),
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
					job_parameters: z
						.object({
							language: documentIntelligenceLanguageSchema,
							output_format: outputFormatSchema,
						})
						.passthrough(),
					job_state: jobStateSchema,
				})
				.passthrough(),
		},
		"/upload-files": {
			method: "post",
			input: z.object({
				job_id: z.string(),
				files: z.array(z.string()).length(1),
			}),
			output: z
				.object({
					job_id: z.string(),
					job_state: jobStateSchema,
					upload_urls: z.record(
						z.string(),
						z.object({
							file_url: z.string().url(),
							url: z.string().url().optional(),
							headers: z.record(z.string(), z.string()).optional(),
							file_metadata: z.record(z.string(), z.unknown()).nullish(),
						}),
					),
					storage_container_type: storageContainerTypeSchema,
				})
				.optional(),
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
		"/:job_id/download-files": {
			method: "post",
			params: z.object({
				job_id: z.string(),
			}),
			output: z
				.object({
					job_id: z.string(),
					job_state: jobStateSchema,
					storage_container_type: storageContainerTypeSchema,
					download_urls: z.record(
						z.string(),
						z.object({
							file_url: z.string().url(),
							file_metadata: z
								.object({
									contentType: z.string().optional(),
									fileSize: z.number().int().nonnegative().optional(),
									lastModified: z.string().optional(),
								})
								.nullish(),
						}),
					),
					error_code: z.string().nullable().optional(),
					error_message: z.string().nullable().optional(),
				})
				.passthrough(),
		},
	},
	{
		strict: true,
		baseURL: "/v1",
	},
);

export const createSarvamVision = (
	apiKey: string,
	baseURL = "https://api.sarvam.ai/doc-digitization/job",
) => {
	return createFetch({
		baseURL,
		schema: visionApiSchema,
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
		case "pdf":
			return "application/pdf";
		case "png":
			return "image/png";
		case "jpg":
		case "jpeg":
			return "image/jpeg";
		case "zip":
			return "application/zip";
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
