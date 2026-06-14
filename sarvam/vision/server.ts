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

type VisionJobCollection = {
	job_id: string;
	email?: string;
};

const getCollection = async (kv: KVNamespace, id: string) => {
	const collection = await kv.get(id);
	if (!collection) return null;

	return JSON.parse(collection) as VisionJobCollection;
};

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
	const getKV = (c: { env: Record<KV, KVNamespace> }) => {
		if (!kvBinding) return null;

		return c.env[kvBinding as KV] as KVNamespace | undefined;
	};

	const resolveJobId = async (
		c: { env: Record<KV, KVNamespace> },
		id: string,
	) => {
		const kv = getKV(c);
		if (!kv) {
			return { job_id: id, collection: null as VisionJobCollection | null };
		}

		const collection = await getCollection(kv, id);
		if (!collection?.job_id) return null;

		return { job_id: collection.job_id, collection };
	};

	const app = new Hono<{
		Bindings: Record<KV, KVNamespace>;
	}>()
		.post(
			"/upload",
			zValidator("form", uploadFormSchema),
			zValidator("json", idParamSchema.partial().optional()),
			async (c) => {
				const kv = getKV(c);

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
				const id = kv ? generateId() : job_id;

				if (kv) {
					await kv.put(
						id,
						JSON.stringify({ job_id } satisfies VisionJobCollection),
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
			zValidator("form", uploadFormSchema),
			async (c) => {
				const { id } = c.req.valid("param");
				const resolved = await resolveJobId(c, id);
				if (!resolved) {
					return c.json({ message: "Invalid id" }, 404);
				}

				const { job_id } = resolved;
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

				return c.json({ id }, 200);
			},
		)
		.post("/:id/status", zValidator("param", idParamSchema), async (c) => {
			const { id } = c.req.valid("param");
			const resolved = await resolveJobId(c, id);
			if (!resolved) {
				return c.json({ message: "Invalid id" }, 404);
			}

			const api = visionJobSDK(resolved.job_id);
			const data = await api.getStatus();

			return c.json(data, 200);
		})
		.post("/:id/download", zValidator("param", idParamSchema), async (c) => {
			const { id } = c.req.valid("param");
			const resolved = await resolveJobId(c, id);
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
				const kv = getKV(c);
				const { id } = c.req.valid("param");
				const { email } = c.req.valid("json");

				const resolved = await resolveJobId(c, id);
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

	if (webHook) app.route("/webhook", webhookServer());
	if (webSocket) app.route("/ws", webSocketServer);

	return app;
};

export default visionServer;
export type VisionServerType = ReturnType<typeof visionServer>;
