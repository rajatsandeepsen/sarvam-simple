import type {
	ExportedHandler,
	MessageBatch,
	Queue,
} from "@cloudflare/workers-types";
import { getCollection, getKV, type JobCollection } from "@/sarvam//utils";
import { visionJobSDK } from "@/sarvam/vision/sdk";
import type visionServer from "@/sarvam/vision/server";

type QueueHandler = ExportedHandler["queue"];
type QueueMessageBody = string | { id?: string };

type VisionQueueCollection = JobCollection & {
	notified?: boolean;
	completed_at?: string;
	failed_at?: string;
};

const getMessageId = (body: QueueMessageBody) => {
	if (typeof body === "string") return body;
	if (body && typeof body === "object" && typeof body.id === "string") {
		return body.id;
	}
	return null;
};

const isRunningState = (state: string) =>
	state === "Accepted" ||
	state === "Pending" ||
	state === "Running" ||
	state === "PartiallyCompleted";

const requeue = async ({
	env,
	msg,
	id,
	queueBinding,
	pollDelaySeconds,
}: {
	env: Record<string, unknown>;
	msg: MessageBatch<QueueMessageBody>["messages"][number];
	id: string;
	queueBinding?: string;
	pollDelaySeconds: number;
}) => {
	if (queueBinding) {
		const queue = env[queueBinding] as Queue<QueueMessageBody> | undefined;
		if (queue) {
			await queue.send(
				{ id },
				pollDelaySeconds > 0 ? { delaySeconds: pollDelaySeconds } : undefined,
			);
			msg.ack();
			return;
		}
	}

	msg.retry();
};

export const getQueue = <KVString extends string>({
	webHook,
	kvBinding,
	SARVAM_API_KEY = process.env.SARVAM_API_KEY as string,
}: Parameters<typeof visionServer>[0] = {}) => {
	type QueueEnv = Parameters<
		NonNullable<
			ExportedHandler<
				Record<KVString, KVNamespace> & Record<string, unknown>
			>["queue"]
		>
	>[1];

	const queueHandler: QueueHandler = async (batch, e) => {
		const env = e as QueueEnv;
		const kv = getKV({ env }, kvBinding);

		if (!kv) {
			console.log("[vision-queue] KV binding missing, acking all messages", {
				count: batch.messages.length,
			});
			for (const msg of batch.messages) msg.ack();
			return;
		}

		for (const msg of batch.messages as MessageBatch<QueueMessageBody>["messages"]) {
			const id = getMessageId(msg.body);
			if (!id) {
				console.log("[vision-queue] Message missing id, acking");
				msg.ack();
				continue;
			}

			console.log("[vision-queue] Processing message", { id });

			try {
				const collection = await getCollection<VisionQueueCollection>(kv, id);
				if (!collection?.job_id) {
					msg.ack();
					continue;
				}

				if (collection.notified || !collection.email || !webHook?.sendEmail) {
					msg.ack();
					continue;
				}

				const api = visionJobSDK(collection.job_id, { SARVAM_API_KEY });
				const status = await api.getStatus();
				console.log("[vision-queue] Job status", {
					id,
					job_id: collection.job_id,
					state: status.job_state,
				});

				if (status.job_state === "Completed") {
					console.log("[vision-queue] Job completed, sending email", { id });
					const data = await api.downloadFiles();
					await webHook.sendEmail(collection.email, data);
					await kv.put(
						id,
						JSON.stringify({
							...collection,
							notified: true,
							completed_at: new Date().toISOString(),
						}),
					);
					msg.ack();
					continue;
				}

				if (status.job_state === "Failed") {
					console.log("[vision-queue] Job failed, marking failed_at", { id });
					await kv.put(
						id,
						JSON.stringify({
							...collection,
							failed_at: new Date().toISOString(),
						}),
					);
					msg.ack();
					continue;
				}

				if (isRunningState(status.job_state)) {
					console.log("[vision-queue] Job still running, requeueing", {
						id,
						state: status.job_state,
					});
					await requeue({
						env: env as Record<string, unknown>,
						msg,
						id,
						queueBinding: webHook.queue?.binding,
						pollDelaySeconds: webHook.queue?.pollDelaySeconds ?? 30,
					});
					continue;
				}

				msg.retry();
			} catch (error) {
				console.error("vision queue error", { id, error });
				msg.retry();
			}
		}
	};

	return queueHandler;
};
