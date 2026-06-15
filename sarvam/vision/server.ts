import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { upgradeWebSocket } from "hono/cloudflare-workers";
import z from "zod";
import {
	checkSarvamWebHook,
	getKV,
	getWebHook,
	resolveJobId,
} from "@/sarvam/utils";
import {
	createSarvamVision,
	uploadSingleFile,
	visionJobParametersSchema,
} from "@/sarvam/vision/api";
import { generateId, visionJobSDK } from "@/sarvam/vision/sdk";

const idParamSchema = z.object({
	id: z.string().min(1),
});

const uploadBaseFormSchema = z.object({
	file: z.union([z.instanceof(File), z.array(z.instanceof(File)).min(1)]),
	email: z.string().email().optional(),
});

const createUploadFormSchema = uploadBaseFormSchema.extend(
	visionJobParametersSchema.shape,
);

const visionServer = <KV extends string>({
	webSocket = false,
	webHook,
	kvBinding,
	SARVAM_API_KEY = process.env.SARVAM_API_KEY as string,
}: {
	SARVAM_API_KEY?: string;
	kvBinding?: KV;
	webSocket?: boolean;
	webHook?: {
		baseUrl: string;
		authToken?: string;
		sendEmail?: (
			email: string,
			options: {
				filename: string;
				url: string;
			}[],
		) => Promise<void>;
	};
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

				const sarvamVision = createSarvamVision(SARVAM_API_KEY);
				const data = await sarvamVision("/v1", {
					throw: true,
					body: {
						job_parameters: moreParams,
						callback:
							webHook && webhookId
								? getWebHook(webhookId, webHook.baseUrl, webHook.authToken)
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

				const api = visionJobSDK(job_id, {
					SARVAM_API_KEY,
				});
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

				const api = visionJobSDK(job_id, { SARVAM_API_KEY });
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

			const api = visionJobSDK(resolved.job_id, { SARVAM_API_KEY });
			const data = await api.getStatus();

			return c.json(data, 200);
		})
		.post("/:id/download", zValidator("param", idParamSchema), async (c) => {
			const { id } = c.req.valid("param");
			const resolved = await resolveJobId(c, id, kvBinding);
			if (!resolved) {
				return c.json({ message: "Invalid id" }, 404);
			}

			const api = visionJobSDK(resolved.job_id, { SARVAM_API_KEY });
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
		app.post(
			"/:id/webhook",
			checkSarvamWebHook(webHook.authToken),
			zValidator("param", idParamSchema),
			async (c) => {
				const { id } = c.req.valid("param");

				const resolved = await resolveJobId(c, id, kvBinding);
				if (!resolved) {
					return c.json({ message: "Invalid id" }, 404);
				}

				const email = resolved?.collection?.email;
				const job_id = resolved?.job_id;
				const action = webHook?.sendEmail;

				if (!email || !action) {
					console.error("No Email");
					return c.json({ message: "Webhook received" }, 200);
				}

				c.executionCtx.waitUntil(
					(async () => {
						const data = await visionJobSDK(job_id, {
							SARVAM_API_KEY,
						}).downloadFiles();
						await action(email, data);
					})(),
				);

				return c.json({ message: "Webhook received" }, 200);
			},
		);
	}

	if (webSocket)
		app.get(
			"/:id/ws",
			upgradeWebSocket((c) => {
				return {
					onMessage(event, ws) {
						console.log(`Message from client: ${event.data}`);
						ws.send("Hello from server!");
					},
					onClose: () => {
						console.log("Connection closed");
					},
				};
			}),
		);

	return app;
};

export default visionServer;
export type VisionServerType = ReturnType<typeof visionServer>;
