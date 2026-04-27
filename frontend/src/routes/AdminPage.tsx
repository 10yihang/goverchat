import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui"
import { BarChart3, Database, Users, Briefcase, ClipboardList, MessageSquare } from "lucide-react"
import { OverviewTab } from "@/components/admin/OverviewTab"
import { KnowledgeTab } from "@/components/admin/KnowledgeTab"
import { UsersTab } from "@/components/admin/UsersTab"
import { ServiceItemsTab } from "@/components/admin/ServiceItemsTab"
import { ApplicationsTab } from "@/components/admin/ApplicationsTab"
import { FeedbackTab } from "@/components/admin/FeedbackTab"

const TABS = [
  { value: "overview", label: "概览", icon: BarChart3 },
  { value: "knowledge", label: "知识库", icon: Database },
  { value: "applications", label: "办理申请", icon: ClipboardList },
  { value: "users", label: "用户", icon: Users },
  { value: "service-items", label: "办事事项", icon: Briefcase },
  { value: "feedback", label: "用户反馈", icon: MessageSquare },
] as const

type TabValue = (typeof TABS)[number]["value"]

export default function AdminPage() {
  const [params, setParams] = useSearchParams()
  const [enablePolling, setEnablePolling] = useState(false)

  const currentTab = (params.get("tab") as TabValue) || "overview"

  const handleTabChange = (value: string) => {
    setParams({ tab: value }, { replace: true })
  }

  return (
    <div className="mx-auto max-w-7xl px-6 pb-16 pt-10">
      <h1 className="mb-1 font-serif text-3xl font-bold">管理后台</h1>
      <p className="mb-6 text-sm text-muted-foreground">系统管理与数据维护</p>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList>
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                <Icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab enablePolling={enablePolling} />
        </TabsContent>
        <TabsContent value="knowledge">
          <KnowledgeTab onPollingChange={setEnablePolling} />
        </TabsContent>
        <TabsContent value="applications">
          <ApplicationsTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="service-items">
          <ServiceItemsTab />
        </TabsContent>
        <TabsContent value="feedback">
          <FeedbackTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
