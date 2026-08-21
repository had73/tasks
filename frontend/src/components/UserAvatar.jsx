import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function UserAvatar({ user, size = 32, className, testid }) {
  const initials = ((user?.first_name?.[0] || "") + (user?.last_name?.[0] || "")).toUpperCase() || "?";
  return (
    <Avatar
      style={{ width: size, height: size }}
      className={cn("ring-2 ring-white", className)}
      data-testid={testid}
    >
      {user?.avatar_url && <AvatarImage src={user.avatar_url} alt={initials} />}
      <AvatarFallback className="bg-zinc-900 text-white text-xs font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

export function UserAvatarGroup({ users, max = 3, size = 28 }) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((u) => (
        <UserAvatar key={u.id} user={u} size={size} />
      ))}
      {extra > 0 && (
        <div
          style={{ width: size, height: size }}
          className="rounded-full bg-zinc-200 text-zinc-700 text-[11px] font-medium flex items-center justify-center ring-2 ring-white"
        >
          +{extra}
        </div>
      )}
    </div>
  );
}
