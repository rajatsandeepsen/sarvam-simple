import { getQueue } from "@/sarvam/vision/queue";
import visionServer from "@/sarvam/vision/server";

export const getVisionServerWithQueue = (
	props: Parameters<typeof visionServer>[0],
) => {
	return {
		server: visionServer(props),
		queue: getQueue(props),
	};
};
