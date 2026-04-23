import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { BookOpen } from "lucide-react"
import { toast } from "sonner"
import { useGuideTopics, useGuideTopic } from "@/hooks/api/useGuide"
import { TopicSidebar } from "@/components/guide/TopicSidebar"
import { TopicDetail } from "@/components/guide/TopicDetail"

export default function GuidePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeSlug = searchParams.get("topic")

  const {
    data: topicsData,
    isLoading: topicsLoading,
    isError: topicsError,
    refetch: refetchTopics,
  } = useGuideTopics()

  const topics = topicsData?.items ?? []

  useEffect(() => {
    if (!activeSlug && topics.length > 0) {
      setSearchParams({ topic: topics[0].slug }, { replace: true })
    }
  }, [activeSlug, topics, setSearchParams])

  useEffect(() => {
    if (topicsError) toast.error("加载主题列表失败，请稍后重试")
  }, [topicsError])

  const {
    data: topicData,
    isLoading: topicLoading,
    isError: topicError,
    refetch: refetchTopic,
  } = useGuideTopic(activeSlug)

  useEffect(() => {
    if (topicError) toast.error("加载主题详情失败")
  }, [topicError])

  const handleSelect = (slug: string) => {
    setSearchParams({ topic: slug }, { replace: true })
  }

  return (
    <div className="mx-auto max-w-7xl px-6 pb-16 pt-10">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{
              background: "color-mix(in oklab, var(--color-accent-gold) 12%, transparent)",
              color: "var(--color-accent-gold)",
            }}
          >
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold">业务引导</h1>
            <p className="text-xs text-muted-foreground">
              分主题展开常办事项的办理步骤、所需材料与温馨提示
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="w-full shrink-0 md:w-80">
          {topicsError ? (
            <div className="rounded-lg border border-[var(--color-border)] p-6 text-center">
              <p className="mb-3 text-sm text-muted-foreground">主题列表加载失败</p>
              <button
                type="button"
                onClick={() => refetchTopics()}
                className="text-sm font-medium"
                style={{ color: "var(--color-primary)" }}
              >
                重新加载
              </button>
            </div>
          ) : (
            <TopicSidebar
              topics={topics}
              activeSlug={activeSlug}
              onSelect={handleSelect}
              isLoading={topicsLoading}
            />
          )}
        </aside>

        <main className="min-w-0 flex-1">
          <TopicDetail
            topic={topicData?.item}
            isLoading={topicLoading && !!activeSlug}
            isError={topicError}
            onRetry={() => refetchTopic()}
          />
        </main>
      </div>
    </div>
  )
}
