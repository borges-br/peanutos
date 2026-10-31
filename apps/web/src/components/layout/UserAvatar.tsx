"use client";

import React from "react";
import AuthenticatedImage from "../ui/AuthenticatedImage";

export default function UserAvatar({
  user,
}: {
  user: { name?: string; avatarUrl?: string | null } | null;
}) {
  return (
    <AuthenticatedImage
      src={user?.avatarUrl}
      alt=""
      aria-hidden="true"
      className="profile-avatar-image"
      fallback={
        <span aria-hidden="true">
          {(user?.name || "P").slice(0, 2).toUpperCase()}
        </span>
      }
    />
  );
}
