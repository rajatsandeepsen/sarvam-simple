import { env } from "env";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import audioServer from "@/sarvam/audio/server";
import { getVisionServerWithQueue } from "@/sarvam/vision/server-queue";
import { createVar } from "@/server/context";
import { sendEmail } from "./context/email";
import type { HonoType } from "./context/types";
import cron from "./cron";

const app = new Hono<HonoType>({
	strict: false,
}).basePath("/api");

app.use(logger());
app.use(
	"/*",
	cors({
		origin: env.CORS_ORIGIN || "",
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: [
			"Content-Type",
			"Authorization",
			"X_SARVAM_JOB_CALLBACK_TOKEN",
		],
		credentials: true,
	}),
);

app.get("/", (c) => {
	return c.text("Hello");
});

app.use(
	createVar("waitUntil", (c) => {
		return (p: Promise<unknown>) => {
			if (!c.executionCtx || c.executionCtx.waitUntil === undefined) {
				throw new Error("No execution context waitUntil available");
			}
			c.executionCtx.waitUntil(p);
		};
	}),
);

app.use(createVar("kv", (c) => c.env.KEYVALUE));

const { server, queue } = getVisionServerWithQueue({
	SARVAM_API_KEY: env.SARVAM_API_KEY,
	webSocket: true,
	kvBinding: "KEYVALUE",
	webHook: {
		queue: {
			binding: "QUEUE",
		},
		baseUrl: "https://simple.sarvam.workers.dev/api/vision",
		sendEmail: async (email, data) => {
			sendEmail({
				from: "<Simple Sarvam> dev@manolo.in",
				to: email,
				text: [
					`Click on the link to start downloading`,
					...data.map((file) => `${file.filename}: ${file.url}`),
				].join("\n"),
				subject: "Your vision files are ready to download -  Simple Sarvam",
			});
		},
	},
});

app.route("/vision", server);

app.route(
	"/audio",
	audioServer({
		SARVAM_API_KEY: env.SARVAM_API_KEY,
		webSocket: true,
		kvBinding: "KEYVALUE",
		webHook: {
			baseUrl: "https://simple.sarvam.workers.dev/api/audio",
			sendEmail: async (email, data) => {
				sendEmail({
					from: "<Simple Sarvam> dev@manolo.in",
					to: email,
					text: [
						`Click on the link to start downloading`,
						...data.map((file) => `${file.filename}: ${file.url}`),
					].join("\n"),
					subject: "Your audio files are ready to download -  Simple Sarvam",
				});
			},
		},
	}),
);

export default {
	fetch: app.fetch,
	scheduled: cron.scheduled,
	queue,
} satisfies ExportedHandler<HonoType["Bindings"]>;
