import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, ApiError } from "@/lib/apiClient"
import { useChatStore } from "@/stores/chatStore"
import { toast } from "sonner"
import type { ChatAnswer, ImageAnalysisResponse, SessionSummary } from "@/types/api"
import type { DisplayMessage } from "@/components/chat/MessageBubble"

const KEYS = {
  sessions: ["sessions"] as const,
  history: (sid: string | null) => ["history", sid] as const,
}

interface VoiceResponse extends ChatAnswer { text: string }
type ImageResponse = ImageAnalysisResponse

function userMsg(content: string, msgType?: "text" | "voice", extra?: Partial<DisplayMessage>): DisplayMessage {
  return { role: "user", content, msg_type: msgType ?? "text", created_at: new Date().toISOString(), ...extra }
}

function botMsg(d: ChatAnswer): DisplayMessage {
  return {
    role: "bot", content: d.answer, msg_type: "text", confidence: d.confidence,
    knowledge_id: d.knowledge_id, sources: d.sources, service_card: d.service_card,
    answer_source: d.answer_source, form_prompt: d.form_prompt,
    follow_up_questions: d.follow_up_questions,
    created_at: new Date().toISOString(),
  }
}

type QC = ReturnType<typeof useQueryClient>

function append(qc: QC, sid: string | null, ...msgs: DisplayMessage[]) {
  qc.setQueryData<DisplayMessage[]>(KEYS.history(sid), (old) => [...(old ?? []), ...msgs])
}

function replacePlaceholder(qc: QC, sid: string | null, ...msgs: DisplayMessage[]) {
  qc.setQueryData<DisplayMessage[]>(KEYS.history(sid), (old) => {
    const arr = [...(old ?? [])]
    arr.pop()
    return [...arr, ...msgs]
  })
}

function handleNewSession(
  qc: QC, prevSid: string | null, newSid: string,
  setActive: (id: string) => void, msgs: DisplayMessage[], dropLast = false,
) {
  const old = qc.getQueryData<DisplayMessage[]>(KEYS.history(prevSid)) ?? []
  const base = dropLast ? old.slice(0, -1) : old
  qc.setQueryData<DisplayMessage[]>(KEYS.history(newSid), [...base, ...msgs])
  setActive(newSid)
}

export function useSessions() {
  return useQuery<SessionSummary[]>({
    queryKey: KEYS.sessions,
    queryFn: async () => {
      const r = await api.get<{ sessions: SessionSummary[] }>("/api/history/sessions")
      return r.sessions
    },
    staleTime: 30_000,
  })
}

export function useHistory(sessionId: string | null) {
  return useQuery<DisplayMessage[]>({
    queryKey: KEYS.history(sessionId),
    queryFn: async () => {
      const r = await api.get<{ messages: DisplayMessage[] }>(`/api/history/${sessionId}`)
      return r.messages
    },
    enabled: !!sessionId,
    staleTime: 0,
  })
}

export function useNewSession() {
  const qc = useQueryClient()
  const setActive = useChatStore((s) => s.setActiveSessionId)
  return useMutation<{ session_id: string }, ApiError, void>({
    mutationFn: () => api.post<{ session_id: string }>("/api/chat/session/new"),
    onSuccess: (d) => {
      setActive(d.session_id)
      qc.setQueryData<DisplayMessage[]>(KEYS.history(d.session_id), [])
      qc.invalidateQueries({ queryKey: KEYS.sessions })
      toast.success("已开启新会话")
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useChatSend() {
  const qc = useQueryClient()
  const setActive = useChatStore((s) => s.setActiveSessionId)
  return useMutation<ChatAnswer, ApiError, { session_id: string | null; text: string }, { prev: string | null }>({
    mutationFn: (v) => api.post<ChatAnswer>("/api/chat/send", { session_id: v.session_id ?? undefined, text: v.text }),
    onMutate: (v) => { append(qc, v.session_id, userMsg(v.text)); return { prev: v.session_id } },
    onSuccess: (d, _, ctx) => {
      if (ctx?.prev !== d.session_id) handleNewSession(qc, ctx?.prev ?? null, d.session_id, setActive, [botMsg(d)])
      else append(qc, d.session_id, botMsg(d))
      qc.invalidateQueries({ queryKey: KEYS.sessions })
    },
    onError: (e, v) => {
      append(qc, v.session_id, { role: "bot", content: `❌ ${e.message}`, msg_type: "text", created_at: new Date().toISOString() })
      toast.error(e.message)
    },
  })
}

export function useVoiceUpload() {
  const qc = useQueryClient()
  const setActive = useChatStore((s) => s.setActiveSessionId)
  return useMutation<VoiceResponse, ApiError, { audio: Blob; session_id: string | null }, { prev: string | null }>({
    mutationFn: (v) => {
      const fd = new FormData()
      fd.append("audio", v.audio, "recording.webm")
      if (v.session_id) fd.append("session_id", v.session_id)
      return api.upload<VoiceResponse>("/api/voice/upload", fd)
    },
    onMutate: (v) => { append(qc, v.session_id, userMsg("🎤 语音识别中…", "voice")); return { prev: v.session_id } },
    onSuccess: (d, _, ctx) => {
      const real = [userMsg(d.text || "（语音内容为空）", "voice"), botMsg(d)]
      if (ctx?.prev !== d.session_id) handleNewSession(qc, ctx?.prev ?? null, d.session_id, setActive, real, true)
      else replacePlaceholder(qc, d.session_id, ...real)
      qc.invalidateQueries({ queryKey: KEYS.sessions })
    },
    onError: (e, v) => { replacePlaceholder(qc, v.session_id); toast.error(e.message) },
  })
}

export function useImageUpload() {
  const qc = useQueryClient()
  const setActive = useChatStore((s) => s.setActiveSessionId)
  return useMutation<ImageResponse, ApiError, { image: File; session_id: string | null }, { prev: string | null }>({
    mutationFn: (v) => {
      const fd = new FormData()
      fd.append("image", v.image)
      if (v.session_id) fd.append("session_id", v.session_id)
      return api.upload<ImageResponse>("/api/image/upload", fd)
    },
    onMutate: (v) => { append(qc, v.session_id, userMsg(`🖼️ 图片识别中… (${v.image.name})`)); return { prev: v.session_id } },
    onSuccess: (d, _, ctx) => {
      const method = d.analysis_method === "vision" ? "🤖" : "🔍"
      const label = d.text || d.filename || "（图片内容为空）"
      const real = [userMsg(`${method} ${label}`, "text", { image_url: d.image_url }), botMsg(d)]
      if (ctx?.prev !== d.session_id) handleNewSession(qc, ctx?.prev ?? null, d.session_id, setActive, real, true)
      else replacePlaceholder(qc, d.session_id, ...real)
      qc.invalidateQueries({ queryKey: KEYS.sessions })
    },
    onError: (e, v) => { replacePlaceholder(qc, v.session_id); toast.error(e.message) },
  })
}

function makeBotPlaceholder(meta: Partial<DisplayMessage> = {}, content = ""): DisplayMessage {
  return {
    role: "bot", content, msg_type: "text",
    created_at: new Date().toISOString(),
    _streaming: true as unknown as undefined,
    ...meta,
  }
}

function ensureBotBubble(qc: QC, sid: string | null, meta: Partial<DisplayMessage>, content: string) {
  const existing = qc.getQueryData<DisplayMessage[]>(KEYS.history(sid))
  const last = existing?.[existing.length - 1]
  if (last?.role === "bot" && last._streaming) {
    // Already exists, update in place
    qc.setQueryData<DisplayMessage[]>(KEYS.history(sid), (old) => {
      const arr = [...(old ?? [])]
      arr[arr.length - 1] = { ...arr[arr.length - 1], ...meta, content, _streaming: true as unknown as undefined }
      return arr
    })
  } else {
    // Create new bot bubble
    append(qc, sid, makeBotPlaceholder(meta, content))
  }
}

export function useSendMessageStream() {
  const qc = useQueryClient()
  return useMutation<void, ApiError, { session_id: string | null; text: string }, { prev: string | null }>({
    mutationFn: async (v) => {
      const { streamPost } = await import("@/lib/apiClient")
      type SE = import("@/types/api").StreamEvent

      const sid = v.session_id
      append(qc, sid, userMsg(v.text))
      // Bot bubble is deferred — created only when first delta arrives

      let accumulated = ""
      let pendingMeta: Partial<DisplayMessage> = {}

      for await (const evt of streamPost<SE>("/api/chat/stream", {
        session_id: sid ?? undefined, text: v.text,
      })) {
        if (evt.type === "meta") {
          pendingMeta = {
            confidence: evt.data.confidence,
            knowledge_id: evt.data.knowledge_id,
            sources: evt.data.sources,
            service_card: evt.data.service_card,
            answer_source: evt.data.answer_source,
          }
        } else if (evt.type === "delta") {
          accumulated += evt.data.text
          ensureBotBubble(qc, sid, pendingMeta, accumulated)
        } else if (evt.type === "done") {
          qc.setQueryData<DisplayMessage[]>(KEYS.history(sid), (old) => {
            const arr = [...(old ?? [])]
            const last = arr[arr.length - 1]
            if (last?.role === "bot") {
              arr[arr.length - 1] = {
                ...last,
                id: evt.data.message_id,
                form_prompt: evt.data.form_prompt,
                answer_source: evt.data.answer_source ?? last.answer_source,
                follow_up_questions: evt.data.follow_up_questions,
                action_card: evt.data.action_card,
                _streaming: undefined,
              }
            }
            return arr
          })
        } else if (evt.type === "error") {
          ensureBotBubble(qc, sid, pendingMeta, `❌ ${evt.data.error}`)
          qc.setQueryData<DisplayMessage[]>(KEYS.history(sid), (old) => {
            const arr = [...(old ?? [])]
            const last = arr[arr.length - 1]
            if (last?.role === "bot") {
              arr[arr.length - 1] = { ...last, _streaming: undefined }
            }
            return arr
          })
        }
      }
      qc.invalidateQueries({ queryKey: KEYS.sessions })
      qc.invalidateQueries({ queryKey: KEYS.history(sid) })
    },
    onMutate: (v) => ({ prev: v.session_id }),
    onError: (e, v) => {
      qc.setQueryData<DisplayMessage[]>(KEYS.history(v.session_id), (old) => {
        const arr = [...(old ?? [])]
        const last = arr[arr.length - 1]
        if (last?.role === "bot" && last._streaming) {
          arr[arr.length - 1] = { ...last, content: `❌ ${e.message}`, _streaming: undefined }
        }
        return arr
      })
      toast.error(e.message)
    },
  })
}

export function useSubmitFeedback() {
  return useMutation<{ ok: boolean; message?: string }, ApiError, { message_id: number; rating: "up" | "down"; reason_text?: string }>({
    mutationFn: (v) => api.post<{ ok: boolean; message?: string }>("/api/chat/feedback", v),
  })
}
