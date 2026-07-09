import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Landing } from "@/components/marketing/landing";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  return <Landing />;
}
