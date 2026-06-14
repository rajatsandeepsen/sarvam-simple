import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { getCollection, getKV, type JobCollection } from "@/sarvam/utils";
import { visionJobSDK } from "./sdk";

type VisionJobCollection = JobCollection;

const checkSarvamWebHook = (callbackToken?: string) =>
	createMiddleware(async (c, next) => {
		if (callbackToken) {
			const signature = c.req.header("X-SARVAM-JOB-CALLBACK-TOKEN");

			if (!signature) return c.json({ error: "Missing signature" }, 401);
			if (signature !== callbackToken)
				return c.json({ error: "Wrong signature" }, 401);
		}

		await next();
	});

export const webhook = <KV extends string>({
	callbackToken,
	kvBinding,
	sendEmail,
}: {
	callbackToken?: string;
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
	}>();

	app.use(checkSarvamWebHook(callbackToken));

	app.post("/", async (c) => {
		await c.req.json().catch(() => null);

		const id = c.req.param("id");
		if (!id) {
			return c.json({ message: "Invalid id" }, 404);
		}

		if (!kvBinding) {
			return c.json({ message: "Webhook received" }, 200);
		}

		const kv = getKV(c, kvBinding);
		if (!kv) {
			return c.json({ message: "Webhook received" }, 200);
		}

		const collection = await getCollection<VisionJobCollection>(kv, id);
		if (!collection) {
			return c.json({ message: "Invalid id" }, 404);
		}
		if (!collection.job_id) {
			return c.json({ message: "Invalid id" }, 404);
		}

		if (!collection.email || !sendEmail) {
			return c.json({ message: "Webhook received" }, 200);
		}

		const email = collection.email;

		c.executionCtx.waitUntil(
			(async () => {
				const data = await visionJobSDK(collection.job_id).downloadFiles();
				await sendEmail(email, data);
			})(),
		);

		return c.json({ message: "Webhook received" }, 200);
	});

	return app;
};
