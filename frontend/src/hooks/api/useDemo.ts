import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/apiClient"

interface DemoStep {
  desc: string
  type: "chat" | "login" | "submit_form" | "info"
  text?: string
  email?: string
  service_slug?: string
  form_data?: Record<string, string>
  note?: string
  expect?: string
}

interface DemoScenario {
  id: string
  title: string
  description: string
  steps: DemoStep[]
}

interface ScenariosResponse {
  scenarios: DemoScenario[]
}

const KEYS = {
  scenarios: ["demo", "scenarios"] as const,
  scenario: (id: string) => ["demo", "scenario", id] as const,
}

export function useDemoScenarios() {
  return useQuery<ScenariosResponse>({
    queryKey: KEYS.scenarios,
    queryFn: () => api.get<ScenariosResponse>("/api/demo/scenarios"),
    staleTime: 60_000,
  })
}

export type { DemoStep, DemoScenario }
