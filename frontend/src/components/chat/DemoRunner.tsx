import { useState, useCallback } from "react"
import {
  Play,
  X,
  ChevronRight,
  CheckCircle2,
  Circle,
  Loader2,
  MessageSquare,
  FileText,
  Info,
  Terminal,
} from "lucide-react"
import { Button, Badge, Skeleton } from "@/components/ui"
import { useDemoScenarios, type DemoScenario, type DemoStep } from "@/hooks/api/useDemo"
import { useChatStore } from "@/stores/chatStore"
import { useSendMessageStream } from "@/hooks/api/useChat"
import { useSubmitApplication } from "@/hooks/api/useApplication"

interface DemoRunnerProps {
  onClose: () => void
}

export function DemoRunner({ onClose }: DemoRunnerProps) {
  const { data, isLoading, error } = useDemoScenarios()
  const [selected, setSelected] = useState<DemoScenario | null>(null)
  const [currentStep, setCurrentStep] = useState(0)

  const handleSelect = useCallback((s: DemoScenario) => {
    setSelected(s)
    setCurrentStep(0)
  }, [])

  const handleBack = useCallback(() => {
    setSelected(null)
    setCurrentStep(0)
  }, [])

  if (error) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b p-4" style={{ borderColor: "var(--color-border)" }}>
          <h3 className="font-serif text-sm font-bold">演示模式</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
          {error.message.includes("403") ? "演示模式仅在开发模式下可用" : "加载失败"}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b p-4" style={{ borderColor: "var(--color-border)" }}>
        <h3 className="font-serif text-sm font-bold">
          {selected ? selected.title : "演示模式"}
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3 p-4">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ) : selected ? (
        <ScenarioRunner
          scenario={selected}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          onBack={handleBack}
        />
      ) : (
        <ScenarioList scenarios={data?.scenarios ?? []} onSelect={handleSelect} />
      )}
    </div>
  )
}

function ScenarioList({
  scenarios,
  onSelect,
}: {
  scenarios: DemoScenario[]
  onSelect: (s: DemoScenario) => void
}) {
  if (scenarios.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
        暂无可用演示场景
      </div>
    )
  }
  return (
    <div className="flex-1 space-y-2 overflow-y-auto p-4">
      {scenarios.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect(s)}
          className="gov-card w-full p-4 text-left transition-colors hover:bg-[var(--color-muted)]"
        >
          <div className="mb-1 flex items-center justify-between">
            <span className="font-serif text-sm font-bold">{s.title}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {s.description}
          </p>
          <Badge tone="neutral" className="mt-2">{s.steps.length} 个步骤</Badge>
        </button>
      ))}
    </div>
  )
}

function ScenarioRunner({
  scenario,
  currentStep,
  setCurrentStep,
  onBack,
}: {
  scenario: DemoScenario
  currentStep: number
  setCurrentStep: (n: number) => void
  onBack: () => void
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b px-4 py-2" style={{ borderColor: "var(--color-border)" }}>
        <Button variant="ghost" size="sm" onClick={onBack} className="text-xs">
          ← 返回场景列表
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <p className="mb-4 text-xs text-muted-foreground">{scenario.description}</p>
        <div className="space-y-3">
          {scenario.steps.map((step, i) => (
            <StepItem
              key={i}
              step={step}
              index={i}
              isCurrent={i === currentStep}
              isDone={i < currentStep}
            />
          ))}
        </div>
      </div>
      <div className="border-t p-4" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            步骤 {currentStep + 1} / {scenario.steps.length}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentStep === 0}
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            >
              上一步
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={currentStep >= scenario.steps.length}
              onClick={() => setCurrentStep(currentStep + 1)}
            >
              下一步
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  chat: MessageSquare,
  submit_form: FileText,
  login: Terminal,
  info: Info,
}

function StepItem({
  step,
  index,
  isCurrent,
  isDone,
}: {
  step: DemoStep
  index: number
  isCurrent: boolean
  isDone: boolean
}) {
  const [running, setRunning] = useState(false)
  const streamSend = useSendMessageStream()
  const submitApp = useSubmitApplication()
  const activeId = useChatStore((s) => s.activeSessionId)

  const Icon = STEP_ICONS[step.type] ?? Info

  const handleRun = useCallback(async () => {
    setRunning(true)
    try {
      if (step.type === "chat" && step.text) {
        streamSend.mutate(
          { session_id: activeId, text: step.text },
          { onSettled: () => setRunning(false) }
        )
      } else if (step.type === "submit_form" && step.service_slug && step.form_data) {
        submitApp.mutate(
          { service_slug: step.service_slug, form_data: step.form_data, session_id: activeId },
          { onSettled: () => setRunning(false) }
        )
      } else {
        setRunning(false)
      }
    } catch {
      setRunning(false)
    }
  }, [step, activeId, streamSend, submitApp])

  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        isCurrent ? "ring-2" : ""
      }`}
      style={{
        borderColor: isCurrent ? "var(--color-primary)" : "var(--color-border)",
        background: isDone ? "var(--color-muted)" : "var(--color-card)",
      }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {isDone ? (
            <CheckCircle2 className="h-4 w-4" style={{ color: "var(--color-success)" }} />
          ) : isCurrent ? (
            <Circle className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon className="h-3 w-3" />
            <span>步骤 {index + 1}</span>
            {step.type === "chat" && <Badge tone="primary" className="text-[10px]">问答</Badge>}
            {step.type === "submit_form" && <Badge tone="success" className="text-[10px]">办理</Badge>}
            {step.type === "info" && <Badge tone="neutral" className="text-[10px]">说明</Badge>}
          </div>
          <p className="mt-1 text-sm leading-relaxed">{step.desc}</p>
          {step.note && (
            <p className="mt-1 text-xs italic text-muted-foreground">💡 {step.note}</p>
          )}
          {(step.type === "chat" || step.type === "submit_form") && isCurrent && (
            <Button
              size="sm"
              onClick={handleRun}
              disabled={running}
              className="mt-2 h-7"
            >
              {running ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  执行中…
                </>
              ) : (
                <>
                  <Play className="mr-1.5 h-3 w-3" />
                  执行此步骤
                </>
              )}
            </Button>
          )}
          {step.text && (
            <div
              className="mt-2 rounded px-2 py-1 font-mono text-xs"
              style={{ background: "var(--color-muted)" }}
            >
              {step.type === "chat" ? `💬 "${step.text}"` : step.text}
            </div>
          )}
          {step.expect && (
            <p className="mt-1 text-xs text-muted-foreground">
              预期：{step.expect}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
