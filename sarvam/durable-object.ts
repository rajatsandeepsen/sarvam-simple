import { DurableObject } from "cloudflare:workers";
import { z } from "zod";

const JobIdSchema = z.string().trim().min(1, "job_id is required");
const EmailSchema = z.string().trim().email("Invalid email format");

type SocketAttachment = {
	jobId: string;
	email?: string;
};

type JobStatusRecord = {
	status: string;
	updatedAt: string;
	data?: unknown;
};

export class SarvamDurableSocket extends DurableObject<{}> {
	constructor(ctx: DurableObjectState, env: {}) {
		super(ctx, env);
	}

	async fetch(request: Request) {
		const url = new URL(request.url);
		const jobIdRaw =
			url.searchParams.get("job_id") ?? url.searchParams.get("jobId") ?? "";
		const jobIdResult = JobIdSchema.safeParse(jobIdRaw);
		if (!jobIdResult.success) {
			return this.json({ error: "Missing or invalid query param: job_id" }, 400);
		}
		const jobId = jobIdResult.data;

		const upgradeHeader = request.headers.get("Upgrade");
		if (upgradeHeader?.toLowerCase() === "websocket") {
			return this.handleWebSocket(request, jobId, url);
		}

		if (request.method === "GET") {
			const current = await this.getJobStatus(jobId);
			return this.json({ jobId, status: current ?? null });
		}

		if (request.method === "POST" || request.method === "PUT" || request.method === "PATCH") {
			let body: unknown;
			try {
				body = await request.json();
			} catch {
				return this.json({ error: "Invalid JSON body" }, 400);
			}

			if (!body || typeof body !== "object") {
				return this.json({ error: "Body must be a JSON object" }, 400);
			}

			const status = (body as { status?: unknown }).status;
			const data = (body as { data?: unknown }).data;

			if (typeof status !== "string" || status.trim().length === 0) {
				return this.json({ error: "Body.status must be a non-empty string" }, 400);
			}

			const record = await this.setJobStatus(jobId, status.trim(), data);
			this.broadcastStatus(jobId, record);

			return this.json({ ok: true, jobId, status: record });
		}

		return this.json({ error: `Method ${request.method} not allowed` }, 405);
	}

	async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
		const attachment = this.readAttachment(ws);
		if (!attachment) {
			ws.close(1008, "Missing socket context");
			return;
		}

		if (message instanceof ArrayBuffer) {
			ws.send(
				JSON.stringify({
					type: "error",
					message: "Only text messages are supported",
				}),
			);
			return;
		}

		const text = message.trim();
		if (!text) {
			ws.send(
				JSON.stringify({
					type: "error",
					message: "Email cannot be empty",
				}),
			);
			return;
		}

		let email: string | null = null;
		try {
			const parsed = JSON.parse(text) as unknown;
			if (
				typeof parsed === "object" &&
				parsed !== null &&
				typeof (parsed as { email?: unknown }).email === "string"
			) {
				email = (parsed as { email: string }).email.trim();
			}
		} catch {
			// Non-JSON message; treat plain string as email.
		}

		if (!email) {
			email = text;
		}

		const emailResult = EmailSchema.safeParse(email);
		if (!emailResult.success) {
			ws.send(
				JSON.stringify({
					type: "error",
					message: "Invalid email format",
				}),
			);
			return;
		}

		const parsedEmail = emailResult.data;
		attachment.email = parsedEmail;
		this.writeAttachment(ws, attachment);
		await this.addEmail(attachment.jobId, parsedEmail);

		ws.send(
			JSON.stringify({
				type: "email_registered",
				jobId: attachment.jobId,
				email: parsedEmail,
			}),
		);

		const current = await this.getJobStatus(attachment.jobId);
		ws.send(
			JSON.stringify({
				type: "status",
				jobId: attachment.jobId,
				status: current ?? {
					status: "waiting",
					updatedAt: new Date().toISOString(),
				},
			}),
		);
	}

	async webSocketClose(ws: WebSocket, code: number, reason: string, _wasClean: boolean) {
		ws.close(code, reason);
	}

	private async handleWebSocket(request: Request, jobId: string, url: URL) {
		const webSocketPair = new WebSocketPair();
		const [client, server] = Object.values(webSocketPair);

		this.ctx.acceptWebSocket(server);

		const emailRaw = url.searchParams.get("email");
		let parsedEmail: string | undefined;
		if (emailRaw !== null) {
			const emailResult = EmailSchema.safeParse(emailRaw);
			if (!emailResult.success) {
				server.close(1008, "Invalid email format");
				return this.json({ error: "Invalid email query parameter" }, 400);
			}
			parsedEmail = emailResult.data;
		}

		const attachment: SocketAttachment = {
			jobId,
			...(parsedEmail ? { email: parsedEmail } : {}),
		};

		this.writeAttachment(server, attachment);

		if (parsedEmail) {
			await this.addEmail(jobId, parsedEmail);
		}

		const current = await this.getJobStatus(jobId);
		server.send(
			JSON.stringify({
				type: "status",
				jobId,
				status: current ?? {
					status: "waiting",
					updatedAt: new Date().toISOString(),
				},
			}),
		);

		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}

	private async getJobStatus(jobId: string): Promise<JobStatusRecord | null> {
		return (await this.ctx.storage.get<JobStatusRecord>(this.statusKey(jobId))) ?? null;
	}

	private async setJobStatus(jobId: string, status: string, data?: unknown): Promise<JobStatusRecord> {
		const record: JobStatusRecord = {
			status,
			updatedAt: new Date().toISOString(),
			...(data === undefined ? {} : { data }),
		};

		await this.ctx.storage.put(this.statusKey(jobId), record);
		return record;
	}

	private async addEmail(jobId: string, email: string): Promise<void> {
		const key = this.emailsKey(jobId);
		const current = (await this.ctx.storage.get<string[]>(key)) ?? [];
		if (!current.includes(email)) {
			current.push(email);
			await this.ctx.storage.put(key, current);
		}
	}

	private broadcastStatus(jobId: string, record: JobStatusRecord) {
		const payload = JSON.stringify({
			type: "status",
			jobId,
			status: record,
		});

		for (const ws of this.ctx.getWebSockets()) {
			const attachment = this.readAttachment(ws);
			if (attachment?.jobId === jobId) {
				ws.send(payload);
			}
		}
	}

	private readAttachment(ws: WebSocket): SocketAttachment | null {
		const data = ws.deserializeAttachment();
		if (!data || typeof data !== "object") return null;

		const jobId = (data as { jobId?: unknown }).jobId;
		const email = (data as { email?: unknown }).email;

		const jobIdResult = JobIdSchema.safeParse(jobId);
		if (!jobIdResult.success) return null;

		if (email !== undefined) {
			const emailResult = EmailSchema.safeParse(email);
			if (!emailResult.success) return null;
			return { jobId: jobIdResult.data, email: emailResult.data };
		}

		return { jobId: jobIdResult.data };
	}

	private writeAttachment(ws: WebSocket, attachment: SocketAttachment) {
		ws.serializeAttachment(attachment);
	}



	private statusKey(jobId: string) {
		return `job:${jobId}:status`;
	}

	private emailsKey(jobId: string) {
		return `job:${jobId}:emails`;
	}

	private json(payload: unknown, status = 200) {
		return new Response(JSON.stringify(payload), {
			status,
			headers: {
				"content-type": "application/json; charset=utf-8",
			},
		});
	}
}
