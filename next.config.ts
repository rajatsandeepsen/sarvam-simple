import createMDX from "@next/mdx";
import { env } from "env";
import type { NextConfig } from "next";

console.log("using server:", env.NEXT_PUBLIC_SERVER_URL, "\n\n");

const nextConfig: NextConfig = {
	pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
	output: "export",
	distDir: env.NODE_ENV === "development" ? "build" : "out",
	trailingSlash: true,
	images: { unoptimized: true },
	turbopack: {
		rules: {
			"*.svg": {
				loaders: ["@svgr/webpack"],
				as: "*.js",
			},
		},
	},
};

const withMDX = createMDX({
	extension: /\.(md|mdx)$/,
	options: {
		remarkPlugins: ["remark-gfm"],
		rehypePlugins: ["rehype-pretty-code"],
	},
});

export default withMDX(nextConfig);
