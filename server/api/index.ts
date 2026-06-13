import z from "zod";
import { env } from "@/lib/env";
import { visionJobSDK } from "@/sarvam/vision";
import { createSarvamVision } from "@/sarvam/vision/api";
import { publicProcedure } from "./procedure";

export const appRouter = {
	healthCheck: publicProcedure.handler(() => {
		return "OK";
	}),
	getURL: publicProcedure
		.input(z.array(z.string()))
		.handler(async ({ input }) => {
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

			console.log(job_id);

			const api = visionJobSDK(job_id);

			return {
				job_id,
				uploader: await api.uploadFiles(input),
			};
		}),
	getStatus: publicProcedure
		.input(z.object({ job_id: z.string() }))
		.handler(async ({ input }) => {
			const api = visionJobSDK(input.job_id);

			return await api.getStatus();
		}),
};

export type AppRouter = typeof appRouter;
