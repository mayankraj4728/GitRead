import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Topbar } from "@/components/layout/topbar";
import { AppOverlays } from "@/components/command/app-overlays";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/");

  return (
    <div className="min-h-screen">
      <Topbar
        user={{
          name: session.user.name,
          image: session.user.image,
          login: session.user.githubLogin,
        }}
      />
      {children}
      <AppOverlays />
    </div>
  );
}
