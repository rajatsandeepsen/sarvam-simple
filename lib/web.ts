import { env } from "env";

export const getBaseURL = (paths?: string) =>
	(env.NEXT_PUBLIC_SERVER_URL ?? "") + (paths ? paths : "");
