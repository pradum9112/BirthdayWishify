"use client";

import * as React from "react"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
  return (
    <div className={`rounded-lg border bg-white text-black shadow-sm dark:bg-gray-900 dark:text-white ${className || ''}`} {...props} />
  )
}

export function CardHeader({ className, ...props }: CardProps) {
  return (
    <div className={`p-4 border-b bg-gray-50 dark:bg-gray-800 rounded-t-lg font-semibold text-lg ${className || ''}`} {...props} />
  )
}

export function CardContent({ className, ...props }: CardProps) {
  return (
    <div className={`p-4 ${className || ''}`} {...props} />
  )
}
