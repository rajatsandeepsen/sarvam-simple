import { env } from "@/lib/env";
import { createSarvamVision } from "./vision";
import { createMiddleware } from "hono/factory";

export const sarvamVision = createSarvamVision(env.SARVAM_API_KEY);


export const checkSarvamWebHook = (CALLBACK_TOKEN = "hi from sarvam") => createMiddleware(async (c, next) => {
	const signature = c.req.header('X-SARVAM-JOB-CALLBACK-TOKEN')

	if (!signature)
		return c.json({ error: 'Missing signature' }, 401)

	if (signature !== CALLBACK_TOKEN)
		return c.json({ error: 'Wrong signature' }, 401)

	await next()
})
