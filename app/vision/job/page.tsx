"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Stepper,
	StepperContent,
	StepperDescription,
	StepperIndicator,
	StepperItem,
	StepperList,
	StepperSeparator,
	StepperTitle,
	StepperTrigger,
} from "@/components/ui/stepper";
import { visionAPI } from "@/hooks/api";
import { SwitchFunc } from "@/lib/utils";

export default function VisionJobPage() {
	const id = useSearchParams().get("id");

	if (!id) {
		return (
			<Container>
				<Card>
					<CardHeader>
						<CardTitle>Missing Job ID</CardTitle>
						<CardDescription>
							Please provide a valid job id in the URL.
						</CardDescription>
					</CardHeader>
				</Card>
			</Container>
		);
	}

	return <Page id={id} />;
}

const steps = [
	{
		value: "loading",
		title: "Loading",
		description: "Fetching from server",
	},
	{
		value: "accepted",
		title: "Job Accepted",
		description: "Your job was created.",
	},
	{
		value: "pending",
		title: "Pending",
		description: "Waiting to process files.",
	},
	{
		value: "running",
		title: "Processing",
		description: "Extracting content from files.",
	},
	{
		value: "completed",
		title: "Completed",
		description: "Downloads are ready.",
	},
	{
		value: "partiallycompleted",
		title: "Partially Completed",
		description: "Some files failed to process.",
	},
	{
		value: "failed",
		title: "Failed",
		description: "Something went wrong.",
	},
] as const;

function Page({ id }: { id: string }) {
	const { data, isFetched, isError } = useQuery(
		visionAPI[":id"].status.$post.queryOptions({
			param: { id },
			refetchInterval: (query) => {
				const jobState = query.state.data?.job_state;
				return jobState === "Completed" || jobState === "Failed" ? false : 3000;
			},
		}),
	);

	const jobState = (
		isError ? "Failed" : (data?.job_state ?? "Loading")
	).toLowerCase() as Lowercase<
		NonNullable<typeof data>["job_state"] | "Loading"
	>;

	return (
		<Container>
			<Card>
				<CardHeader>
					<CardTitle>Your files will be here soon</CardTitle>
					<CardDescription>
						Once the processing is over, you can download it
					</CardDescription>
					{isFetched && (
						<CardAction>
							<Button size={"icon"} variant={"outline"}>
								<Loader2Icon className="animate-spin" />
							</Button>
						</CardAction>
					)}
				</CardHeader>
				<CardContent>
					<Stepper value={jobState} orientation="vertical" nonInteractive>
						<StepperList>
							{steps.map((step) => {
								if (
									(step.value === "loading" ||
										step.value === "pending" ||
										step.value === "failed" ||
										step.value === "partiallycompleted") &&
									step.value !== jobState
								)
									return null;

								return (
									<StepperItem key={step.value} value={step.value}>
										<StepperTrigger className="pb-6">
											<StepperIndicator
												color={SwitchFunc(step.value, {
													partiallycompleted: "orange",
													loading: "red",
													failed: "red",
													completed: "green",
													defaultOption: undefined,
												})}
											/>
											<div className="flex flex-col gap-1">
												<StepperTitle>{step.title}</StepperTitle>
												{step.value === jobState && (
													<StepperDescription>
														{step.description}
													</StepperDescription>
												)}
											</div>
										</StepperTrigger>
									</StepperItem>
								);
							})}
						</StepperList>

						<Card className="grow">
							<CardContent>
								<StepperContent value={"loading"}>
									<CardTitle>Hi</CardTitle>
								</StepperContent>
								<StepperContent value={"accepted"}>
									<CardTitle>Hi</CardTitle>
								</StepperContent>
								<StepperContent value={"pending"}>
									<CardTitle>Hi</CardTitle>
								</StepperContent>
								<StepperContent value={"running"}>
									<CardTitle>Hi</CardTitle>
								</StepperContent>
								<StepperContent value={"partiallycompleted"}>
									<CardTitle>Hi</CardTitle>
								</StepperContent>
								<StepperContent value={"failed"}>
									<CardTitle>{data?.error_message}</CardTitle>
								</StepperContent>
								<StepperContent value={"completed"}>
									<DownloadStepContent id={id} />
								</StepperContent>
							</CardContent>
						</Card>
					</Stepper>
				</CardContent>
			</Card>
		</Container>
	);
}

function DownloadStepContent({ id }: { id: string }) {
	const { data, isLoading, isError, error } = useQuery(
		visionAPI[":id"].download.$post.queryOptions({
			param: { id },
		}),
	);

	if (isLoading) {
		return <Loader2Icon className="animate-spin" />;
	}

	if (isError) {
		return (
			<div className="text-red-600">
				Failed to fetch downloads: {error?.message || "Unknown error"}
			</div>
		);
	}

	if (!data || data.length === 0) {
		return (
			<div className="text-muted-foreground">No download files available.</div>
		);
	}

	return (
		<ul className="space-y-2">
			{data.map((file) => (
				<li key={file.filename} className="rounded-md border p-2">
					<div className="font-medium">{file.filename}</div>
					<a
						href={file.url}
						target="_blank"
						rel="noreferrer"
						className="text-blue-600 underline"
					>
						Download
					</a>
				</li>
			))}
		</ul>
	);
}
