"use client";

import Image from "next/image";
import { LogOut, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/app/actions/auth";

interface Props {
  name?: string | null;
  image?: string | null;
  login?: string | null;
}

export function UserMenu({ name, image, login }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none ring-ring focus-visible:ring-2">
        {image ? (
          <Image
            src={image}
            alt={name ?? "You"}
            width={32}
            height={32}
            className="size-8 rounded-full border border-border"
          />
        ) : (
          <span className="grid size-8 place-items-center rounded-full bg-muted">
            <UserIcon className="size-4" />
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[12rem]">
        <div className="px-2.5 py-2">
          <p className="truncate text-sm font-medium">{name ?? "GitHub user"}</p>
          {login && <p className="truncate text-xs text-muted-foreground">@{login}</p>}
        </div>
        <div className="my-1 h-px bg-border" />
        <form action={logout}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full text-danger">
              <LogOut className="size-4" />
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
