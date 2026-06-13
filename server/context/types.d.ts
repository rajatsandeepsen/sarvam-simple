import type { SarvamDurableSocket } from "@/sarvam/durable-object";
import type { DurableObjectNamespace, KVNamespace } from "@cloudflare/workers-types";

type WaitUntil = (p: Promise<unknown>) => void

export type HonoType = {
	Bindings: {
		SARVAM_DURABLE_SOCKET: DurableObjectNamespace<SarvamDurableSocket>
		KEYVALUE: KVNamespace;
	};
	Variables: {
		waitUntil: WaitUntil;
	};
};
