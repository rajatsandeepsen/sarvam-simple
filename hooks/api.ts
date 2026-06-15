import { QueryCache, QueryClient } from "@tanstack/react-query";
import { hc } from "hono/client";
import { HonoReactQuery } from "hono-tanstack-query";
import { toast } from "sonner";
import type { AudioServerType } from "@/sarvam/audio/server";
import type { VisionServerType } from "@/sarvam/vision/server";

export const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error) => {
			toast.error(`Error: ${error.message}`, {
				action: {
					label: "retry",
					onClick: () => {
						queryClient.invalidateQueries();
					},
				},
			});
		},
	}),
});

const baseUrl =
	process.env.NEXT_PUBLIC_SERVER_URL ??
	(typeof window !== "undefined"
		? window.location.origin
		: "http://localhost:4000");

export const visionAPI = HonoReactQuery(
	hc<VisionServerType>(`${baseUrl}/api/vision`, {
		init: {
			credentials: "include",
		},
	}),
	{ queryClient },
);

export const audioAPI = HonoReactQuery(
	hc<AudioServerType>(`${baseUrl}/api/audio`, {
		init: {
			credentials: "include",
		},
	}),
	{ queryClient },
);
