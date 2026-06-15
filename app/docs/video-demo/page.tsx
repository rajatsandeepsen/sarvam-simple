import { redirect } from "next/navigation";

const videoLink = "https://x.com/rajatsandeepsen";

export default function VideoDemoPage() {
	redirect(videoLink);
}
