import { getQueue } from "./queue";
import visionServer from "./server";

export const getVisionServerWithQueue = (
	props: Parameters<typeof visionServer>[0],
) => {
	return {
		server: visionServer(props),
		queue: getQueue(props),
	};
};
