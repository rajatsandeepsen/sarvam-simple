import { Hono } from "hono";
import { env } from "@/lib/env";
import { generateId } from "@/lib/utils";
import { visionJobSDK } from ".";
import { createSarvamVision, uploadSingleFile } from "./api";
import { webhook as webhookServer } from "./webhook";
import { webSocket as webSocketServer } from "./websocket";

const visionServer = ({
	webSocket = false,
	webHook = false,
	kvBinding,
}: {
	webSocket?: boolean;
	webHook?: boolean;
	kvBinding?: string;
} = {}) => {
	const app = new Hono()
		.post("/upload", async (c) => {
			const body = await c.req.parseBody({ all: true });
			const value = body["file"];

			const files = Array.isArray(value)
				? value.filter((item): item is File => item instanceof File)
				: value instanceof File
					? [value]
					: [];

			if (files.length === 0) {
				return c.text("At least one file is required", 400);
			}

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

			return c.json({ job_id });
		})
		.post("/:id/upload", async (c) => {
			const job_id = c.req.param("id");

			if (!job_id) {
				return c.text("job_id is required", 400);
			}

			const body = await c.req.parseBody({ all: true });
			const value = body["file"];

			const files = Array.isArray(value)
				? value.filter((item): item is File => item instanceof File)
				: value instanceof File
					? [value]
					: [];

			if (files.length === 0) {
				return c.text("At least one file is required", 400);
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

			return c.json({ job_id });
		})
		.post("/:id/status", async (c) => {
			const job_id = c.req.param("id");

			if (!job_id) {
				return c.text("job_id is required", 400);
			}

			const api = visionJobSDK(job_id);
			const data = await api.getStatus();

			return c.json(data);
		})
		.post("/:id/download", async (c) => {
			const job_id = c.req.param("id");

			if (!job_id) {
				return c.text("job_id is required", 400);
			}

			const api = visionJobSDK(job_id);
			const data = await api.downloadFiles();

			return c.json(data);
		});

	if (webHook) app.route("/webhook", webhookServer());
	if (webSocket) app.route("/ws", webSocketServer);

	return app;
};

export default visionServer;
export type VisionServerType = ReturnType<typeof visionServer>;
