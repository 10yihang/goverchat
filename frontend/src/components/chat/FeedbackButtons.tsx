import { useState } from "react"
import { ThumbsUp, ThumbsDown } from "lucide-react"
import { useSubmitFeedback } from "@/hooks/api/useChat"
import { cn } from "@/lib/utils"

interface FeedbackButtonsProps {
  messageId: number
}

export function FeedbackButtons({ messageId }: FeedbackButtonsProps) {
  const [voted, setVoted] = useState<"up" | "down" | null>(null)
  const feedback = useSubmitFeedback()

  function handleVote(rating: "up" | "down") {
    if (voted) return
    setVoted(rating)
    feedback.mutate({ message_id: messageId, rating })
  }

  return (
    <div className="mt-1 flex items-center gap-1">
      <button
        type="button"
        onClick={() => handleVote("up")}
        disabled={!!voted}
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded transition-colors",
          voted === "up"
            ? "text-green-600"
            : "text-[var(--color-muted-foreground)] hover:text-green-600",
        )}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => handleVote("down")}
        disabled={!!voted}
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded transition-colors",
          voted === "down"
            ? "text-red-500"
            : "text-[var(--color-muted-foreground)] hover:text-red-500",
        )}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
