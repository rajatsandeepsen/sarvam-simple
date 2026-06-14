import { createSarvamAudio } from "./api";

export const audioJobSDK = (
	job_id: string,
	{ SARVAM_API_KEY } = {
		SARVAM_API_KEY: process.env.SARVAM_API_KEY as string,
	},
) => {
	const sarvamAudio = createSarvamAudio(SARVAM_API_KEY);

	return {
		getStatus: () =>
			sarvamAudio("/v1/:job_id/status", {
				params: {
					job_id,
				},
				throw: true,
			}),
		start: () =>
			sarvamAudio("/v1/:job_id/start", {
				params: {
					job_id,
				},
				throw: true,
			}),
		uploadFiles: async (files: string[]) => {
			const uploadData = await sarvamAudio("/v1/upload-files", {
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
			const statusData = await sarvamAudio("/v1/:job_id/status", {
				params: {
					job_id,
				},
				throw: true,
			});

			if (statusData.job_state !== "Completed")
				throw new Error("Job not completed yet");

			const outputFiles = statusData.job_details
				.flatMap((job) =>
					job.outputs
						.map((file) => file.file_name)
						.filter((name): name is string => Boolean(name)),
				)
				.filter((name, index, list) => list.indexOf(name) === index);

			const files =
				outputFiles.length > 0
					? outputFiles
					: statusData.job_details
							.flatMap((job) =>
								job.inputs
									.map((file) => file.file_id)
									.filter((id): id is string => Boolean(id))
									.map((id) => `${id}.json`),
							)
							.filter((name, index, list) => list.indexOf(name) === index);

			if (files.length === 0) throw new Error("No output files found");

			const downloadData = await sarvamAudio("/v1/download-files", {
				body: {
					job_id,
					files,
				},
				throw: true,
			});

			if (!downloadData) throw new Error("No Data");

			return Object.entries(downloadData.download_urls).map(
				([filename, data]) => ({ filename, url: data.file_url }),
			);
		},
	};
};

export const generateId = () => {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
		"",
	);
};
