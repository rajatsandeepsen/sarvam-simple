import { z } from "zod";

export type DocumentIntelligenceLanguage =
	| "hi-IN"
	| "en-IN"
	| "bn-IN"
	| "gu-IN"
	| "kn-IN"
	| "ml-IN"
	| "mr-IN"
	| "or-IN"
	| "pa-IN"
	| "ta-IN"
	| "te-IN"
	| "ur-IN"
	| "as-IN"
	| "bodo-IN"
	| "doi-IN"
	| "ks-IN"
	| "kok-IN"
	| "mai-IN"
	| "mni-IN"
	| "ne-IN"
	| "sa-IN"
	| "sat-IN"
	| "sd-IN"
	| (string & {});

export type DocumentIntelligenceOutputFormat = "html" | "md" | "json";

export type JobState =
	| "Accepted"
	| "Pending"
	| "Running"
	| "Completed"
	| "PartiallyCompleted"
	| "Failed";

export type DigitizeDocumentOptions = {
	/**
	 * Primary language of the document in BCP-47 format.
	 * @default "hi-IN"
	 */
	language?: DocumentIntelligenceLanguage;
	/**
	 * Output format for extracted content (delivered as a ZIP buffer).
	 * - `md`: Markdown files (default)
	 * - `html`: Structured HTML with layout preservation
	 * - `json`: Structured JSON for programmatic processing
	 * @default "md"
	 */
	outputFormat?: DocumentIntelligenceOutputFormat;
	/**
	 * Optional webhook URL for job completion notification.
	 */
	callbackUrl?: string;
	/**
	 * Auth token sent as X-SARVAM-JOB-CALLBACK-TOKEN header with the webhook.
	 */
	callbackAuthToken?: string;

	/**
	 * AbortSignal to cancel the operation.
	 */
	abortSignal?: AbortSignal;
};

export type DigitizeDocumentResult = {
	/** Zip archive as a Buffer containing the processed document output files */
	output: Buffer;
	/** Job ID for reference */
	jobId: string;
	/** Final job state */
	jobState: JobState;
	/** Page processing metrics */
	pageMetrics: {
		totalPages: number;
		pagesProcessed: number;
		pagesSucceeded: number;
		pagesFailed: number;
	};
};

const createJobResponseSchema = z.object({
	job_id: z.string(),
	job_state: z.string(),
});

const uploadUrlsResponseSchema = z.object({
	job_id: z.string(),
	upload_urls: z.record(
		z.string(),
		z.object({
			file_url: z.string(),
		}),
	),
});

const jobStatusResponseSchema = z.object({
	job_id: z.string(),
	job_state: z.string(),
	job_details: z
		.array(
			z.object({
				outputs: z
					.array(
						z.object({
							file_id: z.string(),
							file_name: z.string(),
						}),
					)
					.optional(),
				total_pages: z.number().optional(),
				pages_processed: z.number().optional(),
				pages_succeeded: z.number().optional(),
				pages_failed: z.number().optional(),
			}),
		)
		.optional(),
});

const downloadUrlResponseSchema = z.object({
	download_urls: z.record(z.string(), z.object({ file_url: z.string() })),
});

type SarvamDocumentIntelligenceJobClient = {
	getUploadUrls: (args: {
		files: string[];
		abortSignal?: AbortSignal;
	}) => Promise<Record<string, { file_url: string }>>;
	uploadFile: (args: {
		uploadUrl: string;
		file: Buffer | Uint8Array | Blob;
		filename: string;
		abortSignal?: AbortSignal;
	}) => Promise<void>;
	startJob: (args?: {
		abortSignal?: AbortSignal;
	}) => Promise<z.infer<typeof jobStatusResponseSchema>>;
	getJobStatus: (args?: {
		abortSignal?: AbortSignal;
	}) => Promise<z.infer<typeof jobStatusResponseSchema>>;
	waitForCompletion: (args?: {
		abortSignal?: AbortSignal;
	}) => Promise<z.infer<typeof jobStatusResponseSchema>>;
	getDownloadUrls: (args: {
		fileIds: string[];
		abortSignal?: AbortSignal;
	}) => Promise<Record<string, { file_url: string }>>;
};

type SarvamDocumentIntelligenceClient = {
	createJob: (params?: {
		language?: DocumentIntelligenceLanguage;
		outputFormat?: DocumentIntelligenceOutputFormat;
		callbackUrl?: string;
		callbackAuthToken?: string;
		abortSignal?: AbortSignal;
	}) => Promise<{ jobId: string; jobState: JobState }>;
	job: (jobId: string) => SarvamDocumentIntelligenceJobClient;
	getUploadUrls: (args: {
		jobId: string;
		files: string[];
		abortSignal?: AbortSignal;
	}) => Promise<Record<string, { file_url: string }>>;
	uploadFile: (args: {
		uploadUrl: string;
		file: Buffer | Uint8Array | Blob;
		filename: string;
		abortSignal?: AbortSignal;
	}) => Promise<void>;
	startJob: (args: {
		jobId: string;
		abortSignal?: AbortSignal;
	}) => Promise<z.infer<typeof jobStatusResponseSchema>>;
	getJobStatus: (args: {
		jobId: string;
		abortSignal?: AbortSignal;
	}) => Promise<z.infer<typeof jobStatusResponseSchema>>;
	waitForCompletion: (args: {
		jobId: string;
		abortSignal?: AbortSignal;
	}) => Promise<z.infer<typeof jobStatusResponseSchema>>;
	getDownloadUrls: (args: {
		jobId: string;
		fileIds: string[];
		abortSignal?: AbortSignal;
	}) => Promise<Record<string, { file_url: string }>>;
	downloadFile: (args: {
		downloadUrl: string;
		abortSignal?: AbortSignal;
	}) => Promise<Buffer>;
	digitize: (
		file: Buffer | Uint8Array | Blob,
		filename: string,
		options?: DigitizeDocumentOptions,
	) => Promise<DigitizeDocumentResult>;
};

const DEFAULT_SARVAM_BASE_URL = "https://api.sarvam.ai";

function createSarvamDocumentIntelligence(
	apiSubscriptionKey: string,
	fetchFn?: typeof fetch,
	baseURL = DEFAULT_SARVAM_BASE_URL,
): SarvamDocumentIntelligenceClient {
	const fetchImpl = fetchFn ?? globalThis.fetch;
	const authHeaders = (): Record<string, string> => ({
		"api-subscription-key": apiSubscriptionKey,
	});

	async function createJob(params: {
		language?: DocumentIntelligenceLanguage;
		outputFormat?: DocumentIntelligenceOutputFormat;
		callbackUrl?: string;
		callbackAuthToken?: string;
		abortSignal?: AbortSignal;
	} = {}): Promise<{ jobId: string; jobState: JobState }> {
		const {
			language = "hi-IN",
			outputFormat = "md",
			callbackUrl,
			callbackAuthToken,
			abortSignal,
		} = params;

		const createJobRes = await fetchImpl(`${baseURL}/doc-digitization/job/v1`, {
			method: "POST",
			headers: { ...authHeaders(), "Content-Type": "application/json" },
			body: JSON.stringify({
				job_parameters: { language, output_format: outputFormat },
				callback: callbackUrl
					? { url: callbackUrl, auth_token: callbackAuthToken ?? "" }
					: null,
			}),
			signal: abortSignal,
		});

		if (!createJobRes.ok) {
			const err = await createJobRes.json().catch(() => ({}));
			throw new Error(
				`Failed to create document intelligence job: ${JSON.stringify(err)}`,
			);
		}

		const data = createJobResponseSchema.parse(await createJobRes.json());
		return {
			jobId: data.job_id,
			jobState: data.job_state as JobState,
		};
	}

	async function getUploadUrls(args: {
		jobId: string;
		files: string[];
		abortSignal?: AbortSignal;
	}): Promise<Record<string, { file_url: string }>> {
		const res = await fetchImpl(`${baseURL}/doc-digitization/job/v1/upload-files`, {
			method: "POST",
			headers: { ...authHeaders(), "Content-Type": "application/json" },
			body: JSON.stringify({ job_id: args.jobId, files: args.files }),
			signal: args.abortSignal,
		});

		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(`Failed to get upload URLs: ${JSON.stringify(err)}`);
		}

		const { upload_urls } = uploadUrlsResponseSchema.parse(await res.json());
		return upload_urls;
	}

	async function uploadFile(args: {
		uploadUrl: string;
		file: Buffer | Uint8Array | Blob;
		filename: string;
		abortSignal?: AbortSignal;
	}): Promise<void> {
		const fileBlob =
			args.file instanceof Blob
				? args.file
				: new Blob([new Uint8Array(args.file)], {
					type: _mimeType(args.filename),
				});

		const res = await fetchImpl(args.uploadUrl, {
			method: "PUT",
			headers: { "Content-Type": _mimeType(args.filename) },
			body: fileBlob,
			signal: args.abortSignal,
		});

		if (!res.ok) {
			throw new Error(`Failed to upload file: HTTP ${res.status}`);
		}
	}

	async function startJob(args: {
		jobId: string;
		abortSignal?: AbortSignal;
	}): Promise<z.infer<typeof jobStatusResponseSchema>> {
		const res = await fetchImpl(`${baseURL}/doc-digitization/job/v1/${args.jobId}/start`, {
			method: "POST",
			headers: authHeaders(),
			signal: args.abortSignal,
		});

		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(`Failed to start job: ${JSON.stringify(err)}`);
		}

		return jobStatusResponseSchema.parse(await res.json());
	}

	async function getJobStatus(args: {
		jobId: string;
		abortSignal?: AbortSignal;
	}): Promise<z.infer<typeof jobStatusResponseSchema>> {
		const res = await fetchImpl(`${baseURL}/doc-digitization/job/v1/${args.jobId}`, {
			headers: authHeaders(),
			signal: args.abortSignal,
		});

		if (!res.ok) {
			throw new Error(`Failed to get job status: HTTP ${res.status}`);
		}

		return jobStatusResponseSchema.parse(await res.json());
	}

	async function waitForCompletion(args: {
		jobId: string;
		abortSignal?: AbortSignal;
	}): Promise<z.infer<typeof jobStatusResponseSchema>> {
		const statusData = await getJobStatus({
			jobId: args.jobId,
			abortSignal: args.abortSignal,
		});

		if (statusData.job_state === "Failed") {
			throw new Error("Document intelligence job failed");
		}

		return statusData;
	}

	async function getDownloadUrls(args: {
		jobId: string;
		fileIds: string[];
		abortSignal?: AbortSignal;
	}): Promise<Record<string, { file_url: string }>> {
		const res = await fetchImpl(`${baseURL}/doc-digitization/job/v1/download-files`, {
			method: "POST",
			headers: { ...authHeaders(), "Content-Type": "application/json" },
			body: JSON.stringify({ job_id: args.jobId, file_ids: args.fileIds }),
			signal: args.abortSignal,
		});

		if (!res.ok) {
			throw new Error(`Failed to get download URLs: HTTP ${res.status}`);
		}

		const { download_urls } = downloadUrlResponseSchema.parse(await res.json());
		return download_urls;
	}

	async function downloadFile(args: {
		downloadUrl: string;
		abortSignal?: AbortSignal;
	}): Promise<Buffer> {
		const res = await fetchImpl(args.downloadUrl, {
			signal: args.abortSignal,
		});

		if (!res.ok) {
			throw new Error(`Failed to download output: HTTP ${res.status}`);
		}

		return Buffer.from(await res.arrayBuffer());
	}

	/**
	 * Returns a job-scoped API client so you don't need to pass jobId repeatedly.
	 */
	function job(jobId: string): SarvamDocumentIntelligenceJobClient {
		return {
			getUploadUrls: ({ files, abortSignal }) =>
				getUploadUrls({ jobId, files, abortSignal }),
			uploadFile,
			startJob: ({ abortSignal } = {}) => startJob({ jobId, abortSignal }),
			getJobStatus: ({ abortSignal } = {}) => getJobStatus({ jobId, abortSignal }),
			waitForCompletion: ({ abortSignal } = {}) =>
				waitForCompletion({ jobId, abortSignal }),
			getDownloadUrls: ({ fileIds, abortSignal }) =>
				getDownloadUrls({ jobId, fileIds, abortSignal }),
		};
	}

	/**
	 * Full helper flow for doc digitization.
	 * You can also call each API step individually via the other methods.
	 */
	async function digitize(
		file: Buffer | Uint8Array | Blob,
		filename: string,
		options: DigitizeDocumentOptions = {},
	): Promise<DigitizeDocumentResult> {
		const {
			language = "hi-IN",
			outputFormat = "md",
			callbackUrl,
			callbackAuthToken,
			abortSignal,
		} = options;

		const { jobId } = await createJob({
			language,
			outputFormat,
			callbackUrl,
			callbackAuthToken,
			abortSignal,
		});

		const jobApi = job(jobId);
		const uploadUrls = await jobApi.getUploadUrls({
			files: [filename],
			abortSignal,
		});

		const uploadUrl = uploadUrls[filename]?.file_url;
		if (!uploadUrl) {
			throw new Error(`No upload URL returned for file: ${filename}`);
		}

		await jobApi.uploadFile({ uploadUrl, file, filename, abortSignal });
		await jobApi.startJob({ abortSignal });

		const statusData = await jobApi.waitForCompletion({ abortSignal });

		if (
			statusData.job_state !== "Completed" &&
			statusData.job_state !== "PartiallyCompleted"
		) {
			throw new Error(
				`Job ${jobId} is ${statusData.job_state}. Call getJobStatus later and fetch output once completed.`,
			);
		}

		const detail = statusData.job_details?.[0];
		const pageMetrics = {
			totalPages: detail?.total_pages ?? 0,
			pagesProcessed: detail?.pages_processed ?? 0,
			pagesSucceeded: detail?.pages_succeeded ?? 0,
			pagesFailed: detail?.pages_failed ?? 0,
		};

		const outputFileIds =
			detail?.outputs?.map((o) => o.file_id).filter(Boolean) ?? [];

		if (outputFileIds.length === 0) {
			throw new Error("No output files found after job completion");
		}

		const downloadUrls = await jobApi.getDownloadUrls({
			fileIds: outputFileIds,
			abortSignal,
		});

		const firstDownloadUrl = Object.values(downloadUrls)[0]?.file_url;
		if (!firstDownloadUrl) {
			throw new Error("No download URL returned");
		}

		const outputBuffer = await downloadFile({
			downloadUrl: firstDownloadUrl,
			abortSignal,
		});

		return {
			output: outputBuffer,
			jobId,
			jobState: statusData.job_state as JobState,
			pageMetrics,
		};
	}

	return {
		createJob,
		job,
		getUploadUrls,
		uploadFile,
		startJob,
		getJobStatus,
		waitForCompletion,
		getDownloadUrls,
		downloadFile,
		digitize,
	};
}

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

export function createSarvamVision(
	apiSubscriptionKey: string,
	fetchFn?: typeof fetch,
) {
	return createSarvamDocumentIntelligence(
		apiSubscriptionKey,
		fetchFn,
	)
}
