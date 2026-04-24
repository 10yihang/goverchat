import { useState, useEffect, useCallback, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { Menu, Sparkles } from "lucide-react"
import { Button } from "@/components/ui"
import { useChatStore } from "@/stores/chatStore"
import {
  useHistory,
  useSessions,
  useNewSession,
  useChatSend,
  useVoiceUpload,
  useImageUpload,
} from "@/hooks/api/useChat"
import { SessionSidebar, SessionDrawer } from "@/components/chat/SessionSidebar"
import { QuickPanel, QuickSheet } from "@/components/chat/QuickPanel"
import { MessageList } from "@/components/chat/MessageList"
import { ChatComposer } from "@/components/chat/ChatComposer"
import { ChatTopBar } from "@/components/chat/ChatTopBar"
import type { ServiceCard } from "@/types/api"

export default function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [composerText, setComposerText] = useState("")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  const activeId = useChatStore((s) => s.activeSessionId)
  const setActive = useChatStore((s) => s.setActiveSessionId)
  const clearSession = useChatStore((s) => s.clearActiveSession)

  const sessions = useSessions()
  const history = useHistory(activeId)
  const newSession = useNewSession()
  const chatSend = useChatSend()
  const voiceUpload = useVoiceUpload()
  const imageUpload = useImageUpload()

  const isPending = chatSend.isPending || voiceUpload.isPending || imageUpload.isPending

  useEffect(() => {
    const q = searchParams.get("q")
    if (q) {
      setComposerText(q)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const latestServiceCard = useMemo<ServiceCard | null>(() => {
    const msgs = history.data
    if (!msgs) return null
    for (let i = msgs.length - 1; i >= 0; i--) {
      const sc = msgs[i].service_card
      if (sc) return sc
    }
    return null
  }, [history.data])

  const handleSendText = useCallback(
    (text: string) => {
      chatSend.mutate({ session_id: activeId, text })
      setComposerText("")
    },
    [activeId, chatSend]
  )

  const handleSendVoice = useCallback(
    (blob: Blob) => voiceUpload.mutate({ audio: blob, session_id: activeId }),
    [activeId, voiceUpload]
  )

  const handleSendImage = useCallback(
    (file: File) => imageUpload.mutate({ image: file, session_id: activeId }),
    [activeId, imageUpload]
  )

  const handleSelectSession = useCallback(
    (sid: string) => { setActive(sid); setDrawerOpen(false) },
    [setActive]
  )

  const handleQuickQuestion = useCallback(
    (q: string) => { setComposerText(q); setSheetOpen(false) },
    []
  )

  return (
    <div className="flex h-full overflow-hidden">
      <div className="hidden min-h-0 lg:block">
        <SessionSidebar
          sessions={sessions.data} isLoading={sessions.isLoading}
          activeId={activeId} onSelect={handleSelectSession}
          onNew={() => newSession.mutate()} isCreating={newSession.isPending}
        />
      </div>

      <SessionDrawer
        open={drawerOpen} onClose={() => setDrawerOpen(false)}
        sessions={sessions.data} isLoading={sessions.isLoading}
        activeId={activeId} onSelect={handleSelectSession}
        onNew={() => newSession.mutate()} isCreating={newSession.isPending}
      />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(true)} className="ml-2">
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <ChatTopBar sessionId={activeId} onClear={clearSession} />

        <MessageList
          messages={history.data ?? []}
          isLoading={history.isLoading}
          isPending={isPending}
        />

        <ChatComposer
          text={composerText}
          onTextChange={setComposerText}
          onSendText={handleSendText}
          onSendVoice={handleSendVoice}
          onSendImage={handleSendImage}
          isPending={isPending}
        />
      </main>

      <div className="hidden min-h-0 lg:block">
        <QuickPanel onQuickQuestion={handleQuickQuestion} serviceCard={latestServiceCard} />
      </div>

      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="fixed bottom-20 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full shadow-lg"
          style={{ background: "var(--color-accent-gold)", color: "var(--color-accent-gold-foreground)" }}
        >
          <Sparkles className="h-4 w-4" />
        </button>
        <QuickSheet
          open={sheetOpen} onClose={() => setSheetOpen(false)}
          onQuickQuestion={handleQuickQuestion} serviceCard={latestServiceCard}
        />
      </div>
    </div>
  )
}
