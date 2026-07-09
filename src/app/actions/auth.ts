"use server";

import { signIn, signOut } from "@/lib/auth";

export async function loginWithGitHub() {
  await signIn("github", { redirectTo: "/dashboard" });
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}
