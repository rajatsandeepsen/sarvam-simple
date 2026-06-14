"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLinkIcon, Loader2Icon, MailIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	FileUploadItemMetadataRaw,
	FileUploadItemRaw,
	FileUploadListRaw,
} from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import {
	Stepper,
	StepperContent,
	StepperDescription,
	StepperIndicator,
	StepperItem,
	StepperList,
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

	if (jobState === "completed")
		return (
			<Container>
				<Card className="h-min min-w-md">
					<DownloadStepContent id={id} />
				</Card>
			</Container>
		);

	return (
		<Container>
			<Card className="h-min min-w-xs">
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

						<StepperContent value={"accepted"}>
							<Card>
								<CardHeader>
									<CardDescription>
										Your job is created, but no file has been uploaded yet.
									</CardDescription>
									<Button asChild>
										<Link href={`/vision?job_id=${id}`}>Go to upload</Link>
									</Button>
								</CardHeader>
							</Card>
						</StepperContent>
						<StepperContent value={"pending"}>
							<Card>
								<CardHeader>
									<CardDescription>
										If you dont wanna wait, Get notified when it finishes
									</CardDescription>
								</CardHeader>
								<EmailStepContent id={id} />
							</Card>
						</StepperContent>
						<StepperContent value={"running"}>
							<Card>
								<CardHeader>
									<CardDescription>
										If you dont wanna wait, Get notified when it finishes
									</CardDescription>
								</CardHeader>
								<EmailStepContent id={id} />
							</Card>
						</StepperContent>
						<StepperContent value={"partiallycompleted"}>
							<Card>
								<CardHeader>
									<CardDescription>
										Some files failed to process, but some are ready.
									</CardDescription>
								</CardHeader>
							</Card>
						</StepperContent>
						<StepperContent value={"failed"}>
							<Card>
								<CardDescription>{data?.error_message}</CardDescription>
							</Card>
						</StepperContent>
					</Stepper>
				</CardContent>
			</Card>
		</Container>
	);
}

function EmailStepContent({ id }: { id: string }) {
	const [email, setEmail] = useState("");

	return (
		<CardContent>
			<Input
				type="email"
				value={email}
				onChange={(event) => setEmail(event.target.value)}
				placeholder="you@example.com"
				required
			/>
			<Button>
				<MailIcon />
				Save email
			</Button>
		</CardContent>
	);
}

function DownloadStepContent({ id }: { id: string }) {
	const { data, isLoading, isError, error } = useQuery(
		visionAPI[":id"].download.$post.queryOptions({
			param: { id },
		}),
	);

	if (isLoading) {
		return (
			<CardHeader>
				<CardTitle>Loading Your Files</CardTitle>
				<CardDescription>Just a wait a bit</CardDescription>
				<CardAction>
					<Button size={"icon"} variant={"outline"}>
						<Loader2Icon className="animate-spin" />
					</Button>
				</CardAction>
			</CardHeader>
		);
	}

	if (isError) {
		return (
			<CardHeader>
				<CardTitle>Failed to fetch downloads</CardTitle>
				<CardDescription>{error?.message || "Unknown error"}</CardDescription>
			</CardHeader>
		);
	}

	if (!data || data.length === 0) {
		return (
			<CardHeader>
				<CardTitle>No files to download</CardTitle>
				<CardDescription>
					We couldn't find any files to download. This might be because all
					files failed to process.
				</CardDescription>
			</CardHeader>
		);
	}

	const downloadAll = () => {
		for (const file of data) {
			window.open(file.url, "_blank", "noopener,noreferrer");
		}
	};

	return (
		<>
			<CardHeader>
				<CardTitle>Your files are ready</CardTitle>
				<CardDescription>Click on the link icon to download</CardDescription>
			</CardHeader>
			<CardContent>
				<FileUploadListRaw>
					{data.map((file) => (
						<Link
							key={file.url}
							href={file.url}
							target="_blank"
							rel="noreferrer"
						>
							<FileUploadItemRaw>
								<FileUploadItemMetadataRaw>
									{file.filename}
								</FileUploadItemMetadataRaw>
								<Button variant="ghost" size="icon">
									<ExternalLinkIcon />
								</Button>
							</FileUploadItemRaw>
						</Link>
					))}
				</FileUploadListRaw>
			</CardContent>
			<CardFooter>
				<Button onClick={downloadAll}>Download all</Button>
			</CardFooter>
		</>
	);
}
