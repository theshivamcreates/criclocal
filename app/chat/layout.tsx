"use client";

import { AppShell } from "@/components/AppShell";
import { ChatSidebar } from "./ChatSidebar";
import { usePathname } from "next/navigation";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isRoot = pathname === "/chat";

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-4rem)] w-full bg-background overflow-hidden border-t border-outline">
        <ChatSidebar />
        <div className={`flex-1 flex-col h-full bg-background relative ${!isRoot ? "flex" : "hidden md:flex"}`}>
          {children}
        </div>
      </div>
    </AppShell>
  );
}
