"use client";

import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "secondary" | "outline" | "destructive";
}

export function Badge({ className, variant = "secondary", ...props }: BadgeProps) {
  let base = "inline-block px-2 py-0.5 rounded text-xs font-semibold ";
  let color =
    variant === "secondary"
      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
      : variant === "outline"
      ? "border border-blue-600 text-blue-600 bg-transparent"
      : variant === "destructive"
      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
      : "";
  return (
    <span className={`${base}${color} ${className || ""}`} {...props} />
  );
}
