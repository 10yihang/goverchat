import { Link } from "react-router-dom"
import {
  Badge,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Skeleton,
} from "@/components/ui"
import { ExternalLink, Download, MessageSquare, BookOpen, Printer } from "lucide-react"
import { useServiceItem } from "@/hooks/api/useService"
import { openChecklistWindow } from "@/lib/printChecklist"
import type { ServiceChannel, ServiceFaq } from "@/types/api"

interface ItemDetailProps {
  slug: string
}

export function ItemDetail({ slug }: ItemDetailProps) {
  const { data, isLoading } = useServiceItem(slug)
  const item = data?.item

  if (isLoading) {
    return (
      <div className="space-y-4 p-5">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!item) return null

  return (
    <div className="space-y-5 p-5">
      <div>
        <div className="mb-2 flex items-start gap-2">
          <h2 className="font-serif text-lg font-bold leading-snug">
            {item.title}
          </h2>
          <Badge tone="primary" className="shrink-0 mt-0.5">
            {item.category}
          </Badge>
        </div>
        {item.entry_url && (
          <a
            href={item.entry_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            {item.entry_label || "在线办理"}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {item.summary}
      </p>

      <Tabs defaultValue="conditions">
        <TabsList className="flex-wrap">
          <TabsTrigger value="conditions">申请条件</TabsTrigger>
          <TabsTrigger value="materials">所需材料</TabsTrigger>
          <TabsTrigger value="steps">办理步骤</TabsTrigger>
          <TabsTrigger value="channels">办理渠道</TabsTrigger>
          <TabsTrigger value="faq">常见问答</TabsTrigger>
          <TabsTrigger value="tips">温馨提示</TabsTrigger>
        </TabsList>

        <TabsContent value="conditions">
          <ListSection items={item.conditions} empty="暂无申请条件信息" />
        </TabsContent>
        <TabsContent value="materials">
          <ListSection items={item.materials} empty="暂无所需材料信息" />
        </TabsContent>
        <TabsContent value="steps">
          <OrderedList items={item.process_steps} empty="暂无办理步骤信息" />
        </TabsContent>
        <TabsContent value="channels">
          <ChannelList channels={item.channels} />
        </TabsContent>
        <TabsContent value="faq">
          <FaqList faqs={item.faq} />
        </TabsContent>
        <TabsContent value="tips">
          <ListSection items={item.tips} empty="暂无温馨提示" />
        </TabsContent>
      </Tabs>

      <div className="flex flex-col gap-3">
        <Button
          variant="gold"
          className="w-full gap-2"
          onClick={() =>
            openChecklistWindow({
              title: item.title,
              category: item.category,
              materials: item.materials,
              conditions: item.conditions,
              tips: item.tips,
            })
          }
        >
          <Printer className="h-4 w-4" />
          打印材料清单
        </Button>

        {item.download_url && (
          <a
            href={item.download_url}
            target="_blank"
            rel="noreferrer"
            className="block"
          >
            <Button variant="outline" className="w-full gap-2">
              <Download className="h-4 w-4" />
              下载 {item.download_name || "办事材料"}
            </Button>
          </a>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" size="sm" className="flex-1" asChild>
          <Link to={`/guide?topic=${slug}`}>
            <BookOpen className="h-4 w-4" />
            去引导
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="flex-1" asChild>
          <Link to={`/chat?q=${encodeURIComponent(item.qa_seed)}`}>
            <MessageSquare className="h-4 w-4" />
            去咨询
          </Link>
        </Button>
      </div>
    </div>
  )
}

function ListSection({
  items,
  empty,
}: {
  items: string[]
  empty: string
}) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">{empty}</p>
  }
  return (
    <ul className="space-y-2">
      {items.map((text, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
          {text}
        </li>
      ))}
    </ul>
  )
}

function OrderedList({
  items,
  empty,
}: {
  items: string[]
  empty: string
}) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">{empty}</p>
  }
  return (
    <ol className="space-y-2">
      {items.map((text, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed">
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-[var(--color-primary-foreground)]"
            style={{ background: "var(--color-primary)" }}
          >
            {i + 1}
          </span>
          {text}
        </li>
      ))}
    </ol>
  )
}

function ChannelList({ channels }: { channels: ServiceChannel[] }) {
  if (!channels.length) {
    return <p className="text-sm text-muted-foreground">暂无办理渠道信息</p>
  }
  return (
    <div className="grid gap-2">
      {channels.map((ch, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-md border p-3"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div>
            <span className="text-sm font-medium">{ch.name}</span>
            <Badge tone={ch.type === "online" ? "success" : "neutral"} className="ml-2">
              {ch.type === "online" ? "线上" : "线下"}
            </Badge>
          </div>
          {ch.url && (
            <a
              href={ch.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              前往 →
            </a>
          )}
        </div>
      ))}
    </div>
  )
}

function FaqList({ faqs }: { faqs: ServiceFaq[] }) {
  if (!faqs.length) {
    return <p className="text-sm text-muted-foreground">暂无常见问答</p>
  }
  return (
    <div className="space-y-4">
      {faqs.map((faq, i) => (
        <div key={i}>
          <p className="text-sm font-bold">Q：{faq.q}</p>
          <p className="mt-1 text-sm text-muted-foreground">A：{faq.a}</p>
        </div>
      ))}
    </div>
  )
}
