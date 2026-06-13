import { Hono } from "hono";
import { createMiddleware } from "hono/factory";

const checkSarvamWebHook = (CALLBACK_TOKEN?: string) =>
	createMiddleware(async (c, next) => {
		if (!CALLBACK_TOKEN) return;

		const signature = c.req.header("X-SARVAM-JOB-CALLBACK-TOKEN");

		if (!signature) return c.json({ error: "Missing signature" }, 401);

		if (signature !== CALLBACK_TOKEN)
			return c.json({ error: "Wrong signature" }, 401);

		await next();
	});

export const webhook = ({
	callbackToken,
	path = "/",
}: {
	callbackToken?: string;
	path?: `/${string}`;
} = {}) => {
	const app = new Hono();

	app.use(checkSarvamWebHook(callbackToken));

	app.post(path, async (c) => {
		const body = await c.req.json();

		console.log({ body });
	});

	return app;
};
