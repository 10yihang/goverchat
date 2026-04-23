import { useState, useRef, useCallback, useEffect } from "react"

const MAX_DURATION = 60

function detectMime(): string | null {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ]
  for (const mime of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) {
      return mime
    }
  }
  return null
}

export interface UseVoiceRecorderReturn {
  isRecording: boolean
  isSupported: boolean
  duration: number
  error: string | null
  start: () => Promise<void>
  stop: () => Promise<Blob | null>
  reset: () => void
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mimeRef = useRef<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isSupported = typeof navigator !== "undefined"
    && typeof MediaRecorder !== "undefined"
    && !!detectMime()

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    recorderRef.current = null
    chunksRef.current = []
  }, [])

  useEffect(() => cleanup, [cleanup])

  const start = useCallback(async () => {
    setError(null)
    setDuration(0)
    chunksRef.current = []

    const mime = detectMime()
    if (!mime) {
      setError("当前浏览器不支持录音功能。")
      return
    }
    mimeRef.current = mime

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError("麦克风权限被拒绝，请在浏览器设置中允许。")
      return
    }
    streamRef.current = stream

    const recorder = new MediaRecorder(stream, { mimeType: mime })
    recorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.start()
    setIsRecording(true)

    let elapsed = 0
    intervalRef.current = setInterval(() => {
      elapsed += 1
      setDuration(elapsed)
      if (elapsed >= MAX_DURATION) {
        setError("录音超过最长 60 秒，已自动停止")
        recorder.stop()
        setIsRecording(false)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        stream.getTracks().forEach((t) => t.stop())
      }
    }, 1000)
  }, [])

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current
      if (!recorder || recorder.state !== "recording") {
        cleanup()
        setIsRecording(false)
        resolve(null)
        return
      }

      recorder.onstop = () => {
        const blob = chunksRef.current.length > 0
          ? new Blob(chunksRef.current, { type: mimeRef.current ?? "audio/webm" })
          : null
        cleanup()
        setIsRecording(false)
        resolve(blob)
      }

      recorder.stop()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      streamRef.current?.getTracks().forEach((t) => t.stop())
    })
  }, [cleanup])

  const reset = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop()
    }
    cleanup()
    setIsRecording(false)
    setDuration(0)
    setError(null)
  }, [cleanup])

  return { isRecording, isSupported, duration, error, start, stop, reset }
}
