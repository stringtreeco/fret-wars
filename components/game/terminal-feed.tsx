import type { TerminalMessage } from "@/app/page"
import type { RefObject } from "react"
import { cn } from "@/lib/utils"

interface TerminalFeedProps {
  messages: TerminalMessage[]
  terminalRef: RefObject<HTMLDivElement | null>
  className?: string
}

export function TerminalFeed({ messages, terminalRef, className }: TerminalFeedProps) {
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
        "fret-scrollbar flex-1 overflow-y-auto bg-background p-4",
        className
      )}
    >
      <div
        ref={terminalRef}
        className="fret-scrollbar flex h-full max-h-[200px] flex-col gap-2 overflow-y-auto lg:max-h-none"
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
