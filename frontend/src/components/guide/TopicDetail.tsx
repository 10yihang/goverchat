import { Link } from "react-router-dom"
import { CheckCircle2, Info, ArrowRight, MessageSquare, Briefcase } from "lucide-react"
import { Card, CardContent, Badge, Button, Skeleton, Separator } from "@/components/ui"
import type { GuideTopic } from "@/types/api"

interface TopicDetailProps {
  topic: GuideTopic | undefined
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

function DetailSkeleton() {
  return (
    <Card className="gov-card p-8">
      <Skeleton className="mb-2 h-8 w-2/3" />
      <Skeleton className="mb-4 h-5 w-20" />
      <Skeleton className="mb-8 h-16 w-full" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="mb-6">
          <Skeleton className="mb-3 h-5 w-32" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </Card>
  )
}

export function TopicDetail({ topic, isLoading, isError, onRetry }: TopicDetailProps) {
  if (isLoading) return <DetailSkeleton />

  if (isError) {
    return (
      <Card className="gov-card flex flex-col items-center justify-center p-12 text-center">
        <p className="mb-4 text-sm text-muted-foreground">加载失败，请稍后重试</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          重新加载
        </Button>
      </Card>
    )
  }

  if (!topic) {
    return (
      <Card className="gov-card flex items-center justify-center p-12">
        <p className="text-sm text-muted-foreground">请从左侧选择一个主题</p>
      </Card>
    )
  }

  return (
    <Card className="gov-card p-8">
      <CardContent className="p-0">
        <h1 className="font-serif text-2xl font-bold md:text-3xl">{topic.title}</h1>
        <Badge tone="gold" className="mt-2">{topic.category}</Badge>
        <p className="mt-4 leading-relaxed text-muted-foreground">{topic.summary}</p>

        {topic.steps && topic.steps.length > 0 && (
          <>
            <Separator className="my-6" />
            <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-bold">
              <ArrowRight className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
              办理步骤
            </h2>
            <ol className="space-y-3">
              {topic.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-4">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-serif text-base font-bold"
                    style={{
                      color: "var(--color-primary)",
                      background: "color-mix(in oklab, var(--color-primary) 10%, transparent)",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="pt-1 text-sm leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </>
        )}

        {topic.materials && topic.materials.length > 0 && (
          <>
            <Separator className="my-6" />
            <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-bold">
              <CheckCircle2 className="h-4 w-4" style={{ color: "var(--color-accent-gold)" }} />
              所需材料
            </h2>
            <ul className="space-y-2">
              {topic.materials.map((mat, i) => (
                <li key={i} className="flex items-start gap-3 rounded-lg bg-[var(--color-muted)] px-4 py-2.5">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: "var(--color-accent-gold)" }}
                  />
                  <span className="text-sm leading-relaxed">{mat}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {topic.tips && topic.tips.length > 0 && (
          <>
            <Separator className="my-6" />
            <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-bold">
              <Info className="h-4 w-4" style={{ color: "var(--color-accent-gold)" }} />
              温馨提示
            </h2>
            <div className="space-y-2">
              {topic.tips.map((tip, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg px-4 py-3"
                  style={{ background: "color-mix(in oklab, var(--color-accent-gold) 8%, transparent)" }}
                >
                  <Info
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: "var(--color-accent-gold)" }}
                  />
                  <span className="text-sm leading-relaxed">{tip}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <Separator className="my-8" />
        <div className="flex flex-wrap gap-3">
          {topic.qa_seed && (
            <Button asChild>
              <Link to={`/chat?q=${encodeURIComponent(topic.qa_seed)}`}>
                <MessageSquare className="mr-2 h-4 w-4" />
                去咨询
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to={`/service-center?keyword=${encodeURIComponent(topic.title)}`}>
              <Briefcase className="mr-2 h-4 w-4" />
              查看相关办事服务
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
