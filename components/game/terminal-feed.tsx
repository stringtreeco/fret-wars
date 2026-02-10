import type { TerminalMessage } from "@/app/page"
import type { RefObject } from "react"
import { cn } from "@/lib/utils"

interface TerminalFeedProps {
  messages: TerminalMessage[]
  terminalRef: RefObject<HTMLDivElement | null>
  className?: string
  onScroll?: () => void
  scrollMode?: "scroll" | "static"
  showCursor?: boolean
}

export function TerminalFeed({
  messages,
  terminalRef,
  className,
  onScroll,
  scrollMode = "scroll",
  showCursor = true,
}: TerminalFeedProps) {
  const typeStyles = {
    info: "text-muted-foreground",
    warning: "text-accent",
    success: "text-primary",
    event: "text-foreground",
  }

  const typePrefix = {
    info: ">",
    warning: "!",
    success: "+",
    event: "*",
  }

  return (
    <div
      className={cn(
        "flex-1 min-h-0 bg-background p-4",
        className
      )}
    >
      <div
        ref={terminalRef}
        onScroll={onScroll}
        className={cn(
          "flex h-full min-h-0 flex-col gap-2",
          scrollMode === "scroll"
            ? "fret-scrollbar overflow-y-auto"
            : "overflow-hidden"
        )}
      >
        {messages.map((message) =>
          message.isArt ? (
            <pre
              key={message.id}
              className={cn(
                "whitespace-pre text-xs leading-tight",
                typeStyles[message.type]
              )}
            >
              {message.text}
            </pre>
          ) : (
            <div
              key={message.id}
              className={cn(
                "flex items-start gap-2 text-sm leading-relaxed",
                typeStyles[message.type]
              )}
            >
              <span className="shrink-0 text-primary opacity-60">
                {typePrefix[message.type]}
              </span>
              <span>{message.text}</span>
            </div>
          )
        )}
        {showCursor && (
          <div className="flex items-center gap-1 text-primary">
            <span className="animate-pulse">_</span>
          </div>
        )}
      </div>
    </div>
  )
}
