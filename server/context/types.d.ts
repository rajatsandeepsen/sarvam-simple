import type { KVNamespace, Queue } from "@cloudflare/workers-types";

type WaitUntil = (p: Promise<unknown>) => void;

export type HonoType = {
	Bindings: {
		KEYVALUE: KVNamespace;
		QUEUE: Queue;
	};
	Variables: {
		waitUntil: WaitUntil;
		kv: KVNamespace;
	};
};
