import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import z from "zod";
import { env } from "@/lib/env";
import { generateId } from "@/lib/utils";
import { visionJobSDK } from ".";
import { createSarvamVision, uploadSingleFile } from "./api";
import { webhook as webhookServer } from "./webhook";
import { webSocket as webSocketServer } from "./websocket";

const idParamSchema = z.object({
	id: z.string().min(1),
});

const uploadFormSchema = z.object({
	file: z.union([z.instanceof(File), z.array(z.instanceof(File)).min(1)]),
});

const visionServer = <KV extends string>({
	webSocket = false,
	webHook = false,
	sendEmail,
	kvBinding,
}: {
	webSocket?: boolean;
	webHook?: boolean;
	kvBinding?: KV;
	sendEmail?: (
		email: string,
		options: {
			filename: string;
			url: string;
		}[],
	) => Promise<void>;
} = {}) => {
	const app = new Hono<{
		Bindings: Record<KV, KVNamespace>;
	}>()
		.post(
			"/upload",
			zValidator("form", uploadFormSchema),
			zValidator("json", idParamSchema.partial().optional()),
			async (c) => {
				const { file: value } = c.req.valid("form");

				const files = Array.isArray(value) ? value : [value];

				const folder = files.map((f) => ({
					file: f,
					id: `${generateId()}.${f.name.split(".").pop()}`,
				}));

				const sarvamVision = createSarvamVision(env.SARVAM_API_KEY);

				const data = await sarvamVision("/v1", {
					throw: true,
					body: {
						job_parameters: {
							language: "en-IN",
							output_format: "md",
						},
						// callback: {
						// 	url: "https://simple.sarvam.workers.dev/api/vision/webhook",
						// 	// auth_token: "hi from sarvam",
						// },
					},
				});

				const job_id = data.job_id;
				const api = visionJobSDK(job_id);
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

				return c.json({ job_id }, 200);
			},
		)
		.post(
			"/:id/upload",
			zValidator("param", idParamSchema),
			zValidator("form", uploadFormSchema),
			async (c) => {
				const { id: job_id } = c.req.valid("param");
				const { file: value } = c.req.valid("form");

				const files = Array.isArray(value) ? value : [value];

				const folder = files.map((f) => ({
					file: f,
					id: `${generateId()}.${f.name.split(".").pop()}`,
				}));

				const api = visionJobSDK(job_id);
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

				return c.json({ job_id }, 200);
			},
		)
		.post("/:id/status", zValidator("param", idParamSchema), async (c) => {
			const { id: job_id } = c.req.valid("param");

			const api = visionJobSDK(job_id);
			const data = await api.getStatus();

			return c.json(data, 200);
		})
		.post("/:id/download", zValidator("param", idParamSchema), async (c) => {
			const { id: job_id } = c.req.valid("param");

			const api = visionJobSDK(job_id);
			const data = await api.downloadFiles();

			return c.json(data, 200);
		})
		.post(
			"/:id/email",
			zValidator("param", idParamSchema),
			zValidator(
				"json",
				z.object({
					email: z.string().email(),
				}),
			),
			async (c) => {
				const { id: job_id } = c.req.valid("param");
				const { email } = c.req.valid("json");

				const kv = c.env[kvBinding as keyof typeof c.env];

				let data = {};

				const collection = await kv.get(job_id);
				if (collection) data = JSON.parse(collection);

				await kv.put(job_id, JSON.stringify({ ...data, email }));

				return c.json({ message: "Email registered successfully" }, 200);
			},
		);

	if (webHook) app.route("/webhook", webhookServer());
	if (webSocket) app.route("/ws", webSocketServer);

	return app;
};

export default visionServer;
export type VisionServerType = ReturnType<typeof visionServer>;
