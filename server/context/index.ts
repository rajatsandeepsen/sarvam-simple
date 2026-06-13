import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import type { StaticContextORPC } from "../api/procedure";
import type { HonoType } from "./types";

export const createVar = <T extends keyof HonoType["Variables"]>(
	name: T,
	runner: (c: Context<HonoType>) => HonoType["Variables"][T],
) =>
	createMiddleware<HonoType>(async (c, next) => {
		c.set(name, runner(c));
		await next();
	});

export async function createContext(c: Context<HonoType>) {
	const waitUntil = c.get("waitUntil");

	return {
		waitUntil,
		req: c.req.raw,
	} satisfies StaticContextORPC;
}
