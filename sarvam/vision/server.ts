import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import z from "zod";
import { env } from "@/lib/env";
import { generateId } from "@/lib/utils";
import { getKV, getWebHook, resolveJobId } from "@/sarvam/utils";
import { visionJobSDK } from ".";
import {
	createSarvamVision,
	uploadSingleFile,
	visionJobParametersSchema,
} from "./api";
import { webhook as webhookServer } from "./webhook";
import { webSocket as webSocketServer } from "./websocket";

const idParamSchema = z.object({
	id: z.string().min(1),
});

const uploadBaseFormSchema = z.object({
	file: z.union([z.instanceof(File), z.array(z.instanceof(File)).min(1)]),
	email: z.string().email().optional(),
});

const createUploadFormSchema = uploadBaseFormSchema.extend(
	visionJobParametersSchema.pick({
		language: true,
		output_format: true,
	}).shape,
);

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
			zValidator("form", createUploadFormSchema),
			zValidator("json", idParamSchema.partial().optional()),
			async (c) => {
				const kv = getKV(c, kvBinding);
				const webhookId = kv ? generateId() : null;

				const { file: value, email, ...moreParams } = c.req.valid("form");
				const files = Array.isArray(value) ? value : [value];

				const folder = files.map((f) => ({
					file: f,
					id: `${generateId()}.${f.name.split(".").pop()}`,
				}));

				const sarvamVision = createSarvamVision(env.SARVAM_API_KEY);
				const data = await sarvamVision("/v1", {
					throw: true,
					body: {
						job_parameters: moreParams,
						callback:
							webHook && webhookId
								? getWebHook(webhookId, "vision")
								: undefined,
					},
				});

				const job_id = data.job_id;
				const id = webhookId ?? job_id;

				if (kv) {
					await kv.put(
						id,
						JSON.stringify({
							job_id,
							...(email ? { email } : {}),
						}),
					);
				}

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

				return c.json({ id }, 200);
			},
		)
		.post(
			"/:id/upload",
			zValidator("param", idParamSchema),
			zValidator("form", uploadBaseFormSchema),
			async (c) => {
				const kv = getKV(c, kvBinding);
				const { id } = c.req.valid("param");
				const resolved = await resolveJobId(c, id, kvBinding);
				if (!resolved) {
					return c.json({ message: "Invalid id" }, 404);
				}

				const { job_id } = resolved;
				const { file: value, email } = c.req.valid("form");
				const files = Array.isArray(value) ? value : [value];

				if (kv && email) {
					await kv.put(
						id,
						JSON.stringify({
							...(resolved.collection ?? { job_id }),
							email,
						}),
					);
				}

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

				return c.json({ id }, 200);
			},
		)
		.post("/:id/status", zValidator("param", idParamSchema), async (c) => {
			const { id } = c.req.valid("param");
			const resolved = await resolveJobId(c, id, kvBinding);
			if (!resolved) {
				return c.json({ message: "Invalid id" }, 404);
			}

			const api = visionJobSDK(resolved.job_id);
			const data = await api.getStatus();

			return c.json(data, 200);
		})
		.post("/:id/download", zValidator("param", idParamSchema), async (c) => {
			const { id } = c.req.valid("param");
			const resolved = await resolveJobId(c, id, kvBinding);
			if (!resolved) {
				return c.json({ message: "Invalid id" }, 404);
			}

			const api = visionJobSDK(resolved.job_id);
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
				const kv = getKV(c, kvBinding);
				const { id } = c.req.valid("param");
				const { email } = c.req.valid("json");

				const resolved = await resolveJobId(c, id, kvBinding);
				if (!resolved) {
					return c.json({ message: "Invalid id" }, 404);
				}

				if (!kv) {
					return c.json(
						{ message: "KV not configured, email was not stored" },
						200,
					);
				}

				await kv.put(
					id,
					JSON.stringify({
						...(resolved.collection ?? { job_id: resolved.job_id }),
						email,
					}),
				);

				return c.json({ message: "Email registered successfully" }, 200);
			},
		);

	if (webHook) {
		app.route(
			"/:id/webhook",
			webhookServer({
				kvBinding,
				sendEmail,
			}),
		);
	}

	if (webSocket) app.route("/ws", webSocketServer);

	return app;
};

export default visionServer;
export type VisionServerType = ReturnType<typeof visionServer>;
