import type { MetadataRoute } from "next";
import { getBaseURL } from "@/lib/web";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{
			url: getBaseURL(),
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 1,
		},
		{
			url: getBaseURL("/vision"),
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 0.8,
		},
		{
			url: getBaseURL("/docs"),
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 0.6,
		},
		{
			url: getBaseURL("/audio"),
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 0.4,
		},
	];
}
