import Header from "@/components/header";
import Providers from "@/components/providers";
import "@/components/style.css";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
	metadataBase: new URL("https://simple.sarvam.workers.dev"),
	title: "Simple Sarvam AI",
	description: "Use models from Sarvam AI in simplest UI",
	keywords: [
		"simple",
		"sarvam",
		"ai",
		"Vision",
		"document intelligence",
		"india",
		"bharat",
	],
};

export default function Layout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body>
				<Providers>
					<Header />
					<div className="grid min-h-svh grid-rows-[1fr]">
						<Suspense>{children}</Suspense>
					</div>
				</Providers>
			</body>
		</html>
	);
}
