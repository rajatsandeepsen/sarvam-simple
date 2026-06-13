import type { KVNamespace } from "@cloudflare/workers-types";

type WaitUntil = (p: Promise<unknown>) => void

export type HonoType = {
	Bindings: {
		KEYVALUE: KVNamespace;
	};
	Variables: {
		waitUntil: WaitUntil;
	};
};
