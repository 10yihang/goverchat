import { useRef, useCallback, type KeyboardEvent, type FormEvent } from "react"
import { Send, Mic, MicOff, Image as ImageIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui"
import { cn } from "@/lib/utils"
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder"

interface ChatComposerProps {
  text: string
  onTextChange: (text: string) => void
  onSendText: (text: string) => void
  onSendVoice: (blob: Blob) => void
  onSendImage: (file: File) => void
  isPending: boolean
}

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/bmp,image/tiff"

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

export function ChatComposer({
  text,
  onTextChange,
  onSendText,
  onSendVoice,
  onSendImage,
  isPending,
}: ChatComposerProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const submittingRef = useRef(false)
  const voice = useVoiceRecorder()

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault()
      const trimmed = text.trim()
      if (!trimmed || isPending || submittingRef.current) return
      submittingRef.current = true
      onSendText(trimmed)
      onTextChange("")
      if (textareaRef.current) textareaRef.current.style.height = "auto"
      submittingRef.current = false
    },
    [text, isPending, onSendText, onTextChange]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onTextChange(e.target.value)
      const el = e.target
      el.style.height = "auto"
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`
    },
    [onTextChange]
  )

  const handleMicClick = useCallback(async () => {
    if (voice.isRecording) {
      const blob = await voice.stop()
      if (blob) onSendVoice(blob)
    } else {
      await voice.start()
    }
  }, [voice, onSendVoice])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) onSendImage(file)
      e.target.value = ""
    },
    [onSendImage]
  )

  const canSend = text.trim().length > 0 && !isPending

  return (
    <div className="border-t px-6 py-3" style={{ borderColor: "var(--color-border)" }}>
      {voice.error && (
        <p className="mb-2 text-xs" style={{ color: "var(--color-destructive)" }}>
          {voice.error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
        <div
          className="gov-card flex items-end gap-2 p-3"
          style={{ boxShadow: "var(--shadow-elevated)" }}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="输入您的问题…"
            rows={1}
            disabled={voice.isRecording}
            className={cn(
              "flex-1 resize-none border-0 bg-transparent px-1 py-1.5 text-sm leading-6 outline-none",
              "placeholder:text-[var(--color-muted-foreground)]",
              "disabled:opacity-50"
            )}
            style={{ maxHeight: 120, minHeight: 24 }}
          />

          <div className="flex shrink-0 items-center gap-1">
            {voice.isRecording && (
              <span className="mr-1 flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--color-destructive)" }}>
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
                {formatDuration(voice.duration)}
              </span>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleMicClick}
              disabled={isPending || !voice.isSupported}
              title={voice.isRecording ? "停止录音" : "开始录音"}
              className={cn(voice.isRecording && "text-red-500 hover:text-red-600")}
            >
              {voice.isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileRef.current?.click()}
              disabled={isPending || voice.isRecording}
              title="上传图片"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="icon"
              disabled={!canSend}
              title="发送"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </form>

      <input
        ref={fileRef}
        type="file"
        accept={IMAGE_ACCEPT}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
