import { Hono } from "hono";
import { webhook } from "./webhook";
import { webSocket } from "./websocket";

const visionServer = new Hono();

visionServer.route("/webhook", webhook());
visionServer.route("/ws", webSocket);

visionServer.post("/upload", async (c) => {
	const body = await c.req.parseBody({ all: true });
	const value = body["file"];

	const files = Array.isArray(value)
		? value.filter((item): item is File => item instanceof File)
		: value instanceof File
			? [value]
			: [];

	if (files.length === 0) {
		return c.text("At least one file is required", 400);
	}

	return c.json({
		count: files.length,
		files: files.map((file) => ({
			name: file.name,
			size: file.size,
			type: file.type,
		})),
	});
});

export default visionServer;
