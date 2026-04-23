import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { CUser } from "@/types/api"

interface CAuthState {
  user: CUser | null
  setUser: (user: CUser | null) => void
  logout: () => void
}

export const useCAuthStore = create<CAuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    {
      name: "gov_c_user",
      partialize: (state) => ({ user: state.user }),
    },
  ),
)
