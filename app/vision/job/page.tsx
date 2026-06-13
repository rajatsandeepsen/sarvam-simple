"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { api } from "@/hooks/api";

export default function Home() {
	const id = useSearchParams().get("id");

	const { data, isLoading } = useQuery(
		api.getStatus.queryOptions({
			input: {
				job_id: id ?? "",
			},
			enabled: !!id,
		}),
	);

	return (
		<div className="container mx-auto max-w-3xl px-4 py-2">
			<div className="grid gap-6">
				<section className="rounded-lg border p-4">
					<h2 className="mb-2 font-medium">API Status</h2>
					<div className="flex items-center gap-2">
						<div
							className={`h-2 w-2 rounded-full ${data?.job_state === "Completed" ? "bg-green-500" : "bg-red-500"}`}
						/>
						<span className="text-muted-foreground text-sm">
							{isLoading ? "Checking..." : data?.job_state}
						</span>
					</div>
				</section>
			</div>
		</div>
	);
}
