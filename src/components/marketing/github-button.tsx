"use client";

import { useTransition } from "react";
import { Github, Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { loginWithGitHub } from "@/app/actions/auth";

/** Client button that triggers the GitHub sign-in server action. */
export function GitHubButton({ children = "Continue with GitHub", ...props }: ButtonProps) {
  const [pending, start] = useTransition();
  return (
    <Button onClick={() => start(() => loginWithGitHub())} disabled={pending} {...props}>
      {pending ? <Loader2 className="animate-spin" /> : <Github />}
      {children}
    </Button>
  );
}
