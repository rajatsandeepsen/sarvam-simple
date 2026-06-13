/// <reference types="@cloudflare/workers-types" />

type CloudflareBinding = {
	SARVAM_DURABLE_SOCKET: DurableObjectNamespace
};

type WaitUntil = (p: Promise<unknown>) => void

declare global {
	namespace NodeJS {
		interface ProcessEnv extends CloudflareBindings {
			// Additional environment variables can be added here
		}
	}
}
