import { env } from "@/lib/env";
import { createSarvamVision } from "./api";

export const visionJobSDK = (job_id: string) => {
	const sarvamVision = createSarvamVision(env.SARVAM_API_KEY);

	return {
		getStatus: () =>
			sarvamVision("/v1/:job_id/status", {
				params: {
					job_id,
				},
				throw: true,
			}),
		start: () =>
			sarvamVision("/v1/:job_id/start", {
				params: {
					job_id,
				},
				throw: true,
			}),
		uploadFiles: async (files: string[]) => {
			const uploadData = await sarvamVision("/v1/upload-files", {
				body: {
					job_id,
					files,
				},
				throw: true,
			});

			if (!uploadData) throw new Error("No Data");

			return Object.entries(uploadData.upload_urls).map(
				([filename, fileUploadData]) => ({
					uploadUrl: fileUploadData.file_url,
					filename,
				}),
			);
		},

		downloadFiles: async () => {
			const downloadData = await sarvamVision("/v1/:job_id/download-files", {
				params: {
					job_id,
				},
				throw: true,
			});

			if (downloadData.job_state !== "Completed")
				throw new Error("Job not completed yet");

			return Object.entries(downloadData.download_urls).map(
				([filename, data]) => ({ filename, url: data.file_url }),
			);
		},
	};
};
