import type { MDXComponents } from "mdx/types";
import Image from "next/image";
import Link from "next/link";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CodeBlockCopyButton } from "./code-block-copy-button";
import { Container } from "./container";

const getNodeText = (node: React.ReactNode): string => {
	if (node === null || node === undefined || typeof node === "boolean") {
		return "";
	}

	if (typeof node === "string" || typeof node === "number") {
		return String(node);
	}

	if (Array.isArray(node)) {
		return node.map(getNodeText).join("");
	}

	if (typeof node === "object" && "props" in node) {
		return getNodeText((node.props as { children: React.ReactNode }).children);
	}

	return "";
};

const slugify = (node: React.ReactNode): string => {
	return getNodeText(node)
		.trim()
		.toLowerCase()
		.replace(/[’']/g, "")
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-");
};

export const useMDXComponents = (): MDXComponents => ({
	wrapper: ({ children }: React.ComponentProps<"div">) => (
		<Container className="markdown lg:w-lg xl:w-xl 2xl:w-2xl">
			<div className="my-6 space-y-6 text-[0.95rem] text-foreground leading-7">
				{children}
			</div>
		</Container>
	),
	h1: ({ className, ...props }: React.ComponentProps<"h1">) => (
		<h1
			className={cn(
				"mt-2 scroll-m-20 font-semibold text-3xl tracking-tight lg:text-4xl",
				className,
			)}
			{...props}
		/>
	),
	h2: ({ className, ...props }: React.ComponentProps<"h2">) => (
		<h2
			id={slugify(props.children)}
			className={cn(
				"mt-10 scroll-m-20 border-b pb-2 font-semibold text-2xl tracking-tight first:mt-0",
				className,
			)}
			{...props}
		/>
	),
	h3: ({ className, ...props }: React.ComponentProps<"h3">) => (
		<h3
			id={slugify(props.children)}
			className={cn(
				"mt-8 scroll-m-20 font-semibold text-xl tracking-tight",
				className,
			)}
			{...props}
		/>
	),
	h4: ({ className, ...props }: React.ComponentProps<"h4">) => (
		<h4
			id={slugify(props.children)}
			className={cn(
				"mt-6 scroll-m-20 font-semibold text-lg tracking-tight",
				className,
			)}
			{...props}
		/>
	),
	h5: ({ className, ...props }: React.ComponentProps<"h5">) => (
		<h5 className={cn("mt-6 font-semibold text-base", className)} {...props} />
	),
	h6: ({ className, ...props }: React.ComponentProps<"h6">) => (
		<h6
			className={cn(
				"mt-6 font-semibold text-muted-foreground text-sm",
				className,
			)}
			{...props}
		/>
	),
	a: ({ className, href, ...props }: React.ComponentProps<"a">) => {
		const url = href ?? "";
		const isExternal = /^https?:\/\//.test(url);

		if (isExternal) {
			return (
				<a
					href={url}
					target="_blank"
					rel="noreferrer noopener"
					className={cn(
						"font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary",
						className,
					)}
					{...props}
				/>
			);
		}

		return (
			<Link
				href={url}
				className={cn(
					"font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary",
					className,
				)}
				{...props}
			/>
		);
	},
	p: ({ className, ...props }: React.ComponentProps<"p">) => (
		<p
			className={cn("leading-7 [&:not(:first-child)]:mt-6", className)}
			{...props}
		/>
	),
	strong: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
		<strong
			className={cn("font-semibold text-foreground", className)}
			{...props}
		/>
	),
	ul: ({ className, ...props }: React.ComponentProps<"ul">) => (
		<ul
			className={cn("my-6 ml-6 list-disc [&>li]:mt-2", className)}
			{...props}
		/>
	),
	ol: ({ className, ...props }: React.ComponentProps<"ol">) => (
		<ol
			className={cn("my-6 ml-6 list-decimal [&>li]:mt-2", className)}
			{...props}
		/>
	),
	li: ({ className, ...props }: React.ComponentProps<"li">) => (
		<li
			className={cn("has-[input]:-ml-4 has-[input]:list-none", className)}
			{...props}
		/>
	),
	blockquote: ({ className, ...props }: React.ComponentProps<"blockquote">) => (
		<blockquote
			className={cn(
				"mt-6 border-l-2 pl-6 text-muted-foreground italic",
				className,
			)}
			{...props}
		/>
	),
	img: ({ className, alt, ...props }: React.ComponentProps<"img">) => (
		<img
			className={cn("my-6 rounded-lg border", className)}
			alt={alt}
			{...props}
		/>
	),
	hr: ({ ...props }: React.ComponentProps<"hr">) => (
		<hr className="my-10 border-border" {...props} />
	),
	table: ({ className, ...props }: React.ComponentProps<"table">) => (
		<div className="no-scrollbar my-6 w-full overflow-x-auto rounded-lg border">
			<table
				className={cn(
					"w-full text-sm [&_tbody_tr:last-child]:border-0 [&_tr]:border-b",
					className,
				)}
				{...props}
			/>
		</div>
	),
	tr: ({ className, ...props }: React.ComponentProps<"tr">) => (
		<tr className={cn("m-0 border-border", className)} {...props} />
	),
	th: ({ className, ...props }: React.ComponentProps<"th">) => (
		<th
			className={cn(
				"bg-muted/50 px-4 py-2 text-left font-medium [&[align=center]]:text-center [&[align=right]]:text-right",
				className,
			)}
			{...props}
		/>
	),
	td: ({ className, ...props }: React.ComponentProps<"td">) => (
		<td
			className={cn(
				"px-4 py-2 align-top [&[align=center]]:text-center [&[align=right]]:text-right",
				className,
			)}
			{...props}
		/>
	),
	pre: ({ className, children, ...props }: React.ComponentProps<"pre">) => {
		const codeText = getNodeText(children).replace(/\n$/, "");

		return (
			<pre
				className={cn(
					"group no-scrollbar relative my-6 overflow-x-auto rounded-lg border bg-muted/40 p-4 pr-14 text-sm",
					className,
				)}
				{...props}
			>
				{children}
				<CodeBlockCopyButton code={codeText} />
			</pre>
		);
	},
	figure: ({ className, ...props }: React.ComponentProps<"figure">) => {
		return <figure className={cn("my-6", className)} {...props} />;
	},
	figcaption: ({
		className,
		children,
		...props
	}: React.ComponentProps<"figcaption">) => {
		return (
			<figcaption
				className={cn(
					"mt-2 flex items-center gap-2 text-muted-foreground text-sm [&_svg]:size-4 [&_svg]:opacity-70",
					className,
				)}
				{...props}
			>
				{children}
			</figcaption>
		);
	},
	code: ({ className, ...props }: React.ComponentProps<"code">) => {
		if (typeof props.children === "string") {
			return (
				<code
					className={cn(
						"relative rounded-md bg-muted px-[0.3rem] py-[0.2rem] font-mono text-[0.85em]",
						className,
					)}
					{...props}
				/>
			);
		}

		return <code {...props} />;
	},
	Image: ({
		src,
		className,
		width,
		height,
		alt,
		...props
	}: React.ComponentProps<"img">) => (
		<Image
			className={cn("mt-6 rounded-lg border", className)}
			src={(src as string) || ""}
			width={Number(width)}
			height={Number(height)}
			alt={alt || ""}
			{...props}
		/>
	),

	Button,
	Link: ({ className, ...props }: React.ComponentProps<typeof Link>) => (
		<Link
			className={cn(
				"font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary",
				className,
			)}
			{...props}
		/>
	),
	LinkedCard: ({ className, ...props }: React.ComponentProps<typeof Link>) => (
		<Button className={className} asChild>
			<Link {...props} />
		</Button>
	),
});
