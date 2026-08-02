import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SessionGuard } from "@/components/layout/session-guard";
import { AppOverlays } from "@/components/command/app-overlays";
import { Toaster } from "@/components/ui/toaster";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/");

  return (
    <div className="min-h-screen pb-14 lg:pb-0">
      <SessionGuard />
      <Topbar
        user={{
          name: session.user.name,
          image: session.user.image,
          login: session.user.githubLogin,
        }}
      />
      {children}
      <MobileNav />
      <AppOverlays />
      <Toaster />
    </div>
  );
}
