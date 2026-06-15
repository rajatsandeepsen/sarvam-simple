import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import z from "zod";
import {
	audioJobParametersSchema,
	createSarvamAudio,
	uploadSingleFile,
} from "@/sarvam/audio/api";
import { audioJobSDK, generateId } from "@/sarvam/audio/sdk";

const idParamSchema = z.object({
	id: z.string().min(1),
});

const uploadFormSchema = z
	.object({
		file: z.union([z.instanceof(File), z.array(z.instanceof(File)).min(1)]),
	})
	.extend(audioJobParametersSchema.shape);

const simpleVisionServer = () => {
	const app = new Hono()
		.post("/upload", zValidator("form", uploadFormSchema), async (c) => {
			const { file: value, ...jobParameters } = c.req.valid("form");
			const files = Array.isArray(value) ? value : [value];

			const folder = files.map((file) => ({
				file,
				id: `${generateId()}.${file.name.split(".").pop()}`,
			}));

			const sarvamAudio = createSarvamAudio(
				process.env.SARVAM_API_KEY as string,
			);
			const data = await sarvamAudio("/v1", {
				throw: true,
				body: {
					job_parameters: jobParameters,
				},
			});

			const job_id = data.job_id;
			const api = audioJobSDK(job_id);
			const upload = await api.uploadFiles(folder.map((f) => f.id));

			c.executionCtx.waitUntil(
				(async () => {
					await Promise.all(
						upload.map((u) => {
							const file = folder.find((f) => f.id === u.filename)?.file;
							if (!file) return null;

							return uploadSingleFile({
								...u,
								file,
							});
						}),
					);

					await api.start();
				})(),
			);

			return c.json({ id: job_id }, 200);
		})
		.post("/:id/status", zValidator("param", idParamSchema), async (c) => {
			const { id } = c.req.valid("param");
			const api = audioJobSDK(id);
			const data = await api.getStatus();

			return c.json(data, 200);
		})
		.post("/:id/download", zValidator("param", idParamSchema), async (c) => {
			const { id } = c.req.valid("param");
			const api = audioJobSDK(id);
			const data = await api.downloadFiles();

			return c.json(data, 200);
		});

	return app;
};

export default simpleVisionServer;
export type SimpleVisionServerType = ReturnType<typeof simpleVisionServer>;
