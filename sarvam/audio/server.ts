import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { upgradeWebSocket } from "hono/cloudflare-workers";
import z from "zod";
import {
	audioJobParametersSchema,
	createSarvamAudio,
	uploadSingleFile,
} from "@/sarvam/audio/api";
import { audioJobSDK, generateId } from "@/sarvam/audio/sdk";
import {
	checkSarvamWebHook,
	getKV,
	getWebHook,
	resolveJobId,
} from "@/sarvam/utils";

const idParamSchema = z.object({
	id: z.string().min(1),
});

const uploadBaseFormSchema = z.object({
	file: z.union([z.instanceof(File), z.array(z.instanceof(File)).min(1)]),
	email: z.string().email().optional(),
});

const uploadFormSchema = uploadBaseFormSchema.extend(
	audioJobParametersSchema.shape,
);

const audioServer = <KV extends string>({
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
			zValidator("form", uploadFormSchema),
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

				const sarvamAudio = createSarvamAudio(SARVAM_API_KEY);
				const data = await sarvamAudio("/v1", {
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

				const api = audioJobSDK(job_id, {
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

				const api = audioJobSDK(job_id, {
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
		.post("/:id/status", zValidator("param", idParamSchema), async (c) => {
			const { id } = c.req.valid("param");
			const resolved = await resolveJobId(c, id, kvBinding);
			if (!resolved) {
				return c.json({ message: "Invalid id" }, 404);
			}

			const api = audioJobSDK(resolved.job_id, {
				SARVAM_API_KEY,
			});
			const data = await api.getStatus();

			return c.json(data, 200);
		})
		.post("/:id/download", zValidator("param", idParamSchema), async (c) => {
			const { id } = c.req.valid("param");
			const resolved = await resolveJobId(c, id, kvBinding);
			if (!resolved) {
				return c.json({ message: "Invalid id" }, 404);
			}

			const api = audioJobSDK(resolved.job_id, {
				SARVAM_API_KEY,
			});
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
						const data = await audioJobSDK(job_id).downloadFiles();
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

export default audioServer;
export type AudioServerType = ReturnType<typeof audioServer>;
