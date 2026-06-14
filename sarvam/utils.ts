export type JobCollection = {
	job_id: string;
	email?: string;
};

type KVContext<KV extends string> = {
	env: Record<KV, KVNamespace>;
};

export const getKV = <KV extends string>(c: KVContext<KV>, kvBinding?: KV) => {
	if (!kvBinding) return null;

	return c.env[kvBinding] as KVNamespace | undefined;
};

export const getCollection = async <T extends JobCollection = JobCollection>(
	kv: KVNamespace,
	id: string,
) => {
	const collection = await kv.get(id);
	if (!collection) return null;

	return JSON.parse(collection) as T;
};

export const resolveJobId = async <
	KV extends string,
	T extends JobCollection = JobCollection,
>(
	c: KVContext<KV>,
	id: string,
	kvBinding?: KV,
) => {
	const kv = getKV(c, kvBinding);
	if (!kv) {
		return { job_id: id, collection: null as T | null };
	}

	const collection = await getCollection<T>(kv, id);
	if (!collection?.job_id) return null;

	return { job_id: collection.job_id, collection };
};

export const getWebHook = (id: string, type: "audio" | "vision") => ({
	url: `https://simple.sarvam.workers.dev/api/${type}/${id}/webhook`,
	// "auth_token":
});
