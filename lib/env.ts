import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	/**
	 * Specify your server-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars.
	 */
	server: {
		CORS_ORIGIN: z.string().url().optional(),
		SARVAM_API_KEY: z.string(),

		NODEMAILER_EMAIL: z.string().email(),
		NODEMAILER_PASS: z.string(),

		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
	},

	/**
	 * Specify your client-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars. To expose them to the client, prefix them with
	 * `NEXT_PUBLIC_`.
	 */
	client: {
		NEXT_PUBLIC_SERVER_URL: z.string().url().optional(),
	},

	/**
	 * You can't destruct `env.env` as a regular object in the Next.js edge runtimes (e.g.
	 * middlewares) or client-side so we need to destruct manually.
	 */
	runtimeEnv: {
		CORS_ORIGIN: process.env.CORS_ORIGIN,

		SARVAM_API_KEY: process.env.SARVAM_API_KEY,

		NODEMAILER_EMAIL: process.env.NODEMAILER_EMAIL,
		NODEMAILER_PASS: process.env.NODEMAILER_PASS,

		NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,

		NODE_ENV: process.env.NODE_ENV
	},
	/**
	 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
	 * useful for Docker builds.
	 */
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	/**
	 * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
	 * `SOME_VAR=''` will throw an error.
	 */
	emptyStringAsUndefined: true,
});
