import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const truncateText = (text: string, maxLength: number) => {
	if (text.length <= maxLength) return text;

	const firstHalf = text.slice(0, Math.ceil(maxLength / 2));
	const secondHalf = text.slice(-Math.floor(maxLength / 2));

	return `${firstHalf}...${secondHalf}`;
};

export const generateId = () => {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
		"",
	);
};

export const SwitchFunc = <T extends string | number, R>(
	cases: T,
	{
		defaultOption,
		...options
	}: {
		defaultOption?: R;
	} & Partial<{
		[K in T]: R;
	}>,
): R => {
	return (options[cases as keyof typeof options] ?? defaultOption) as R;
};
