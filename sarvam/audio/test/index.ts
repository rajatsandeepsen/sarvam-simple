import { env } from "@/lib/env";
import { createSarvamAudio, uploadSingleFile } from "../api";

const sarvamAudio = createSarvamAudio(env.SARVAM_API_KEY);

const x1 = await sarvamAudio("/v1", {
	body: {
		job_parameters: {
			language: "en-IN",
			mode: "transcribe",
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

const x2 = await sarvamAudio("/v1/:job_id/status", {
	params: {
		job_id,
	},
	throw: true,
});
console.log(x2);

const filename = "audio.wav";

const x3 = await sarvamAudio("/v1/upload-files", {
	body: {
		job_id,
		files: [filename],
	},
	throw: true,
});
console.log(x3);

const file = new Uint8Array(
	await Bun.file("./sarvam/audio/test/audio.wav").arrayBuffer(),
);

const uploadUrl = x3?.upload_urls[filename].file_url;

if (!uploadUrl) throw new Error("Missing upload URL");

await uploadSingleFile({ uploadUrl, file, filename });

const x4 = await sarvamAudio("/v1/:job_id/start", {
	params: {
		job_id,
	},
	throw: true,
});
console.log(x4);

const x5 = await sarvamAudio("/v1/:job_id/status", {
	params: {
		job_id,
	},
	throw: true,
});
console.log(x5.job_details);

const outFileId = x5.job_details[0].inputs.find(
	(e) => e.file_name === filename,
)?.file_id;
if (!outFileId) throw new Error("Missing out file id");

const outFileName = `${outFileId}.json`;

const x6 = await sarvamAudio("/v1/download-files", {
	body: {
		job_id,
		files: [outFileName],
	},
	throw: true,
});
console.log(x6);
