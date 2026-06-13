import Link from "next/link";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function () {
	return (
		<Container>
			<Card>
				<CardHeader>
					<CardTitle>Simple Sarvam</CardTitle>
					<CardDescription>
						Use models from Sarvam.AI in a simplest UI
					</CardDescription>
				</CardHeader>
				<CardFooter className="flex-wrap gap-2">
					<Button className="grow" asChild>
						<Link href={"/vision"}>Vision</Link>
					</Button>
					<Button className="grow" asChild>
						<Link href={"/audio"}>Audio</Link>
					</Button>
				</CardFooter>
			</Card>
		</Container>
	);
}
