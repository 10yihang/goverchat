import { useEffect, useRef } from "react"
import { MessageBubble } from "./MessageBubble"
import { TypingIndicator } from "./TypingIndicator"
import { Skeleton } from "@/components/ui"
import { Sparkles } from "lucide-react"
import type { DisplayMessage } from "./MessageBubble"

interface MessageListProps {
  messages: DisplayMessage[]
  isLoading: boolean
  isPending: boolean
  onFollowUpClick?: (text: string) => void
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{
          background: "color-mix(in oklab, var(--color-primary) 10%, transparent)",
          color: "var(--color-primary)",
        }}
      >
        <Sparkles className="h-7 w-7" />
      </div>
      <div>
        <h3 className="font-serif text-lg font-bold">开始智能咨询</h3>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          输入问题、发送语音或上传图片，即可获得政务解答
        </p>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={`flex gap-3 ${i % 2 === 1 ? "flex-row-reverse" : ""}`}>
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <Skeleton className="h-16 w-2/3 rounded-md" />
        </div>
      ))}
    </div>
  )
}

export function MessageList({ messages, isLoading, isPending, onFollowUpClick }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, isPending])

  if (isLoading) return <div className="flex-1 overflow-hidden"><LoadingSkeleton /></div>
  if (messages.length === 0 && !isPending) return <div className="flex flex-1 overflow-hidden"><EmptyState /></div>

  return (
    <div className="chat-scroll flex-1 overflow-y-auto px-6 py-4">
      <div className="mx-auto max-w-3xl space-y-5">
        {messages.map((msg, i) => (
          <MessageBubble key={`${msg.created_at ?? ""}-${i}`} message={msg} onFollowUpClick={onFollowUpClick} />
        ))}
        {isPending && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
