import { Upload } from "lucide-react";
import type { ReactNode } from "react";

type FileUploadDropzoneContentProps = {
	title: string;
	description: string;
	subtitle: string;
	children: ReactNode;
};

export function FileUploadDropzoneContent({
	title,
	description,
	subtitle,
	children,
}: FileUploadDropzoneContentProps) {
	return (
		<>
			<div className="flex flex-col items-center gap-1 text-center">
				<div className="flex items-center justify-center rounded-full border p-2.5">
					<Upload className="size-6 text-muted-foreground" />
				</div>
				<p className="font-medium text-sm">{title}</p>
				<p className="text-muted-foreground text-xs">{description}</p>
				<p className="text-muted-foreground text-xs">{subtitle}</p>
			</div>
			{children}
		</>
	);
}
