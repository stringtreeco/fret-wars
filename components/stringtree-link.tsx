"use client"

import { track } from "@/lib/analytics"
import { cn } from "@/lib/utils"

type StringTreeLinkProps = {
  source?: string
  variant?: "dark" | "light"
  className?: string
  logoClassName?: string
  description?: string
  descriptionClassName?: string
}

export function StringTreeLink({
  source,
  variant = "dark",
  className,
  logoClassName,
  description,
  descriptionClassName,
}: StringTreeLinkProps) {
  const logoToneClass =
    variant === "dark"
      ? "brightness-0 invert opacity-90 group-hover:opacity-100 group-hover:brightness-110 group-focus-visible:opacity-100"
      : "opacity-90 group-hover:opacity-100 group-hover:brightness-95 group-focus-visible:opacity-100"

  return (
    <a
      href="https://stringtree.co"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group rounded-sm transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        description ? "inline-flex flex-col items-center gap-1" : "inline-flex items-center",
        className
      )}
      aria-label="Visit StringTree"
      title="Visit StringTree"
      onClick={() => {
        if (source) track("stringtree_link_clicked", { source })
      }}
    >
      <img
        src="/stringtree-logo.png"
        alt=""
        aria-hidden="true"
        className={cn("h-4 w-auto select-none transition-[opacity,filter]", logoToneClass, logoClassName)}
      />
      {description ? (
        <span
          className={cn(
            "text-xs text-muted-foreground/90 transition-colors group-hover:text-muted-foreground",
            descriptionClassName
          )}
        >
          {description}
        </span>
      ) : null}
      <span className="sr-only">Visit StringTree</span>
    </a>
  )
}
