import { RPCHandler } from "@orpc/server/fetch";
import { env } from "env";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { triedAsync } from "@/lib/tools";
import audioServer from "@/sarvam/audio/server";
import visionServer from "@/sarvam/vision/server";
import { appRouter } from "@/server/api";
import { createContext, createVar } from "@/server/context";
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
			c.executionCtx.waitUntil(triedAsync(p, "Inside waitUntil"));
		};
	}),
);

app.use(createVar("kv", (c) => c.env.KEYVALUE));

app.route(
	"/vision",
	visionServer({
		webHook: true,
		webSocket: true,
		kvBinding: "KEYVALUE",
		sendEmail: async (email, data) => {
			sendEmail({
				from: "<Simple Sarvam> dev@manolo.in",
				to: email,
				text: [
					`Click on the link to start downloading`,
					...data.map((file) => `${file.filename}: ${file.url}`),
				].join("\n"),
				subject: "Your files are ready to download -  Simple Sarvam",
			});
		},
	}),
);

app.route(
	"/audio",
	audioServer({
		webHook: true,
		webSocket: true,
		kvBinding: "KEYVALUE",
		sendEmail: async (email, data) => {
			sendEmail({
				from: "<Simple Sarvam> dev@manolo.in",
				to: email,
				text: [
					`Click on the link to start downloading`,
					...data.map((file) => `${file.filename}: ${file.url}`),
				].join("\n"),
				subject: "Your files are ready to download -  Simple Sarvam",
			});
		},
	}),
);

app.use("/*", async (c, next) => {
	const handler = new RPCHandler(appRouter);

	const context = await createContext(c);

	const { matched, response } = await handler.handle(c.req.raw, {
		prefix: "/api",
		context,
	});

	if (matched) {
		return c.newResponse(response.body, response);
	}
	await next();
});

export default {
	fetch: app.fetch,
	scheduled: cron.scheduled,
};

// import { SarvamDurableSocket } from "@/sarvam/durable-object";
// export { SarvamDurableSocket };
