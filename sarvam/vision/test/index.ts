import { env } from "@/lib/env";
import { createSarvamVision, uploadSingleFile } from "../api";

const sarvamVision = createSarvamVision(env.SARVAM_API_KEY);

const x1 = await sarvamVision("/v1", {
	body: {
		job_parameters: {
			language: "en-IN",
			output_format: "md",
		},
		// callback: {
		//	url: "https://simple.sarvam.workers.dev/api/vision/webhook",
		//	auth_token: "hi from sarvam",
		// },
	},
	throw: true,
});
console.log(x1);

const job_id = x1.job_id;

const x2 = await sarvamVision("/v1/:job_id/status", {
	params: {
		job_id,
	},
	throw: true,
});
console.log(x2);

const filename = "simple.pdf";

const x3 = await sarvamVision("/v1/upload-files", {
	body: {
		job_id,
		files: [filename],
	},
	throw: true,
});
console.log(x3);

const file = new Uint8Array(
	await Bun.file("./sarvam/vision/test/simple.pdf").arrayBuffer(),
);

const uploadUrl = x3?.upload_urls[filename].file_url;

if (!uploadUrl) throw new Error("Missing upload URL");

await uploadSingleFile({ uploadUrl, file, filename });

const x4 = await sarvamVision("/v1/:job_id/start", {
	params: {
		job_id,
	},
	throw: true,
});
console.log(x4);

const x5 = await sarvamVision("/v1/:job_id/status", {
	params: {
		job_id,
	},
	throw: true,
});
console.log(x5);

const x6 = await sarvamVision("/v1/:job_id/download-files", {
	params: {
		job_id,
	},
	throw: true,
});
console.log(x6);

console.log(x6.download_urls[filename].file_url)
