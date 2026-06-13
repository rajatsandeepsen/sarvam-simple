import { publicProcedure } from "./procedure";

export const appRouter = {
	healthCheck: publicProcedure.handler(() => {
		return "OK";
	}),
};
export type AppRouter = typeof appRouter;
