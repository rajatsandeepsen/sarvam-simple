import {
	AudioLinesIcon,
	BookOpenTextIcon,
	EyeIcon,
	GithubIcon,
	HouseIcon,
} from "lucide-react";

import Logo from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ModeToggle } from "./mode-toggle";

const navigationLinks = [
	{ href: "/", icon: HouseIcon, label: "Home" },
	{ href: "/vision", icon: EyeIcon, label: "Vision" },
	{ href: "/audio", icon: AudioLinesIcon, label: "Audio" },
	{ href: "/docs", icon: BookOpenTextIcon, label: "Docs" },
	{
		href: "https://github.com/rajatsandeepsen/sarvam-simple",
		icon: GithubIcon,
		label: "GitHub",
	},
];

export default function Header() {
	return (
		<header className="border-b px-4 md:px-6">
			<div className="flex h-16 items-center justify-between gap-4">
				<div className="flex flex-1 items-center gap-2">
					<Popover>
						<PopoverTrigger asChild>
							<Button
								className="group size-8 md:hidden"
								size="icon"
								variant="ghost"
							>
								<svg
									className="pointer-events-none"
									fill="none"
									height={16}
									stroke="currentColor"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									viewBox="0 0 24 24"
									width={16}
									xmlns="http://www.w3.org/2000/svg"
								>
									<title>Logo</title>
									<path
										className="origin-center -translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-x-0 group-aria-expanded:translate-y-0 group-aria-expanded:rotate-315"
										d="M4 12L20 12"
									/>
									<path
										className="origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45"
										d="M4 12H20"
									/>
									<path
										className="origin-center translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-135"
										d="M4 12H20"
									/>
								</svg>
							</Button>
						</PopoverTrigger>
						<PopoverContent align="start" className="w-36 p-1 md:hidden">
							<NavigationMenu className="max-w-none *:w-full">
								<NavigationMenuList className="flex-col items-start gap-0 md:gap-2">
									{navigationLinks.map((link) => {
										const Icon = link.icon;
										return (
											<NavigationMenuItem className="w-full" key={link.label}>
												<NavigationMenuLink
													className="flex-row items-center gap-2 py-1.5"
													href={link.href}
												>
													<Icon
														aria-hidden="true"
														className="text-muted-foreground/80"
														size={16}
													/>
													<span>{link.label}</span>
												</NavigationMenuLink>
											</NavigationMenuItem>
										);
									})}
								</NavigationMenuList>
							</NavigationMenu>
						</PopoverContent>
					</Popover>

					<NavigationMenu className="max-md:hidden">
						<NavigationMenuList className="gap-2">
							{navigationLinks.map((link) => {
								const Icon = link.icon;
								return (
									<NavigationMenuItem key={link.label}>
										<NavigationMenuLink
											className="flex-row items-center gap-2 py-1.5 font-medium text-foreground hover:text-primary"
											href={link.href}
										>
											<Icon
												aria-hidden="true"
												className="text-muted-foreground/80"
												size={16}
											/>
											<span>{link.label}</span>
										</NavigationMenuLink>
									</NavigationMenuItem>
								);
							})}
						</NavigationMenuList>
					</NavigationMenu>
				</div>

				<div className="flex items-center">
					<a
						className="text-primary hover:text-primary/90"
						href="https://sarvam.ai"
					>
						<Logo />
					</a>
				</div>

				<div className="flex flex-1 items-center justify-end gap-4">
					<ModeToggle />
				</div>
			</div>
		</header>
	);
}
