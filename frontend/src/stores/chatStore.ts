import { create } from "zustand"
import { persist } from "zustand/middleware"

interface ChatState {
  activeSessionId: string | null
  setActiveSessionId: (id: string | null) => void
  clearActiveSession: () => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      activeSessionId: null,
      setActiveSessionId: (id) => set({ activeSessionId: id }),
      clearActiveSession: () => set({ activeSessionId: null }),
    }),
    {
      name: "gov_session_id",
      partialize: (state) => ({ activeSessionId: state.activeSessionId }),
    }
  )
)
