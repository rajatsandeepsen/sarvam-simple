/// <reference types="@cloudflare/workers-types" />

type CloudflareBinding = {
	CHAT: DurableObjectNamespace
	KEYVALUE: KVNamespace
};

type WaitUntil = (p: Promise<unknown>) => void

declare global {
	namespace NodeJS {
		interface ProcessEnv extends CloudflareBindings {
			// Additional environment variables can be added here
		}
	}
}
