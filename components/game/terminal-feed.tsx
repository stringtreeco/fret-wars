import type { TerminalMessage } from "@/app/page"
import type { RefObject } from "react"
import { cn } from "@/lib/utils"

interface TerminalFeedProps {
  messages: TerminalMessage[]
  terminalRef: RefObject<HTMLDivElement | null>
  className?: string
  onScroll?: () => void
}

export function TerminalFeed({ messages, terminalRef, className, onScroll }: TerminalFeedProps) {
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
        className="fret-scrollbar flex h-full max-h-[200px] min-h-0 flex-col gap-2 overflow-y-auto lg:max-h-none"
      >
        {messages.map((message) => (
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
        ))}
        <div className="flex items-center gap-1 text-primary">
          <span className="animate-pulse">_</span>
        </div>
      </div>
    </div>
  )
}
