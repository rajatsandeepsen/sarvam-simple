"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CodeBlockCopyButtonProps = {
	code: string;
	className?: string;
};

export function CodeBlockCopyButton({
	code,
	className,
}: CodeBlockCopyButtonProps) {
	const [copied, setCopied] = useState(false);
	const timeoutRef = useRef<number | null>(null);

	useEffect(() => {
		return () => {
			if (timeoutRef.current !== null) {
				window.clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	const handleCopy = async () => {
		if (!code || typeof navigator?.clipboard?.writeText !== "function") {
			return;
		}

		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);

			if (timeoutRef.current !== null) {
				window.clearTimeout(timeoutRef.current);
			}

			timeoutRef.current = window.setTimeout(() => {
				setCopied(false);
			}, 4000);
		} catch {
			setCopied(false);
		}
	};

	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			onClick={handleCopy}
			aria-label={copied ? "Copied" : "Copy code"}
			className={cn(
				"absolute top-3 right-3 h-7 px-2 font-normal text-muted-foreground text-xs opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100",
				className,
			)}
		>
			{copied ? (
				<CheckIcon className="size-3.5" />
			) : (
				<CopyIcon className="size-3.5" />
			)}
			{copied ? "Copied" : "Copy"}
		</Button>
	);
}
