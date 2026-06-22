"use client";

import { MessageSquare } from "lucide-react";

export default function ChatPlaceholder() {
  return (
    <div className="h-full hidden md:flex flex-col items-center justify-center bg-background p-8 text-center">
      <div className="w-24 h-24 border-2 border-on-surface-variant rounded-full flex items-center justify-center mb-4">
        <MessageSquare size={48} className="text-on-surface" />
      </div>
      <h2 className="text-2xl font-bold text-on-surface">Your Messages</h2>
      <p className="text-sm mt-2 max-w-xs text-on-surface-variant">
        Send private messages to a friend or another player.
      </p>
    </div>
  );
}
