export type AnswerSource = "knowledge" | "web"
export type MessageRole = "user" | "bot"
export type MessageType = "text" | "voice"

export interface KnowledgeSource {
  knowledge_id: number | null
  question: string
  category: string
  score: number
}

export interface ServiceCard {
  slug: string
  title: string
  category: string
  summary: string
  entry_label?: string
  entry_url?: string
  has_form?: boolean
  material_count?: number
}

export interface FormFieldOption {
  label?: string
  value?: string
}

export type FormFieldType =
  | "text"
  | "textarea"
  | "tel"
  | "date"
  | "select"
  | "email"
  | "number"

export interface FormFieldSchema {
  name: string
  label: string
  type: FormFieldType
  required: boolean
  placeholder?: string
  options?: string[]
  pattern?: string
  max_length?: number
}

export interface FormSchema {
  submit_label: string
  intro?: string
  fields: FormFieldSchema[]
}

export interface FormPrompt {
  service_slug: string
  service_title: string
  form_schema: FormSchema
  intent_source?: string
  intent_confidence?: number
}

export interface IntentMeta {
  intent: "submission" | "inquiry"
  confidence: number
  reason?: string
  source?: string
}

export interface ChatAnswer {
  answer: string
  confidence: number
  knowledge_id: number | null
  sources: KnowledgeSource[]
  session_id: string
  service_card?: ServiceCard | null
  answer_source?: AnswerSource
  form_prompt?: FormPrompt | null
  intent_meta?: IntentMeta | null
}

export interface CUser {
  id: number
  email: string
  display_name: string
}

export interface CAuthMeResponse {
  authenticated: boolean
  user: CUser | null
}

export interface SendCodeResponse {
  ok: true
  message: string
  cooldown: number
  dev_code?: string
  dev_warning?: string
}

export interface VerifyCodeResponse {
  ok: true
  message: string
  user: CUser
  is_new: boolean
}

export interface ApplicationRecord {
  id: number
  query_no: string
  user_id?: number
  user_email?: string
  session_id?: string
  service_slug: string
  service_title: string
  applicant_name: string
  applicant_phone: string
  form_data?: Record<string, string | number | boolean | null>
  status: "已提交" | "审核中" | "材料待补充" | "办理完成" | "已退回"
  admin_remark?: string | null
  created_at?: string
  updated_at?: string
}

export interface ApplicationsAdminResponse {
  items: ApplicationRecord[]
  status_options: string[]
  status_counts: Record<string, number>
}

export interface ChatMessage {
  id?: number
  role: MessageRole
  content: string
  msg_type?: MessageType
  confidence?: number
  knowledge_id?: number | null
  created_at?: string
}

export interface SessionSummary {
  session_id: string
  title?: string
  message_count: number
  preview?: string
  updated_at?: string
}

export interface AuthUser {
  id: number
  username: string
  role: "admin" | "viewer"
}

export interface AuthMeResponse {
  authenticated: boolean
  user: AuthUser | null
}

export interface GuideTopic {
  slug: string
  title: string
  category: string
  summary: string
  steps?: string[]
  materials?: string[]
  tips?: string[]
  qa_seed?: string
}

export interface ServiceChannel {
  name: string
  type: "online" | "offline"
  url?: string
}

export interface ServiceFaq {
  q: string
  a: string
}

export interface ServiceItem {
  slug: string
  title: string
  category: string
  summary: string
  conditions: string[]
  materials: string[]
  process_steps: string[]
  channels: ServiceChannel[]
  faq: ServiceFaq[]
  tips: string[]
  entry_label: string
  entry_url: string
  qa_seed: string
  keywords: string[]
  download_name?: string
  download_url?: string
  is_active: number
}

export interface ProgressTimelineEntry {
  label: string
  time: string
  done: boolean
}

export interface ProgressRecord {
  query_no: string
  status: string
  stage: string
  updated_at: string
  timeline: ProgressTimelineEntry[]
  next_step: string
  pending_materials: string[]
  applicant_name?: string
  service_title?: string
  admin_remark?: string
  is_real?: boolean
}

export interface ProgressQueryResponse {
  found: boolean
  message?: string
  record?: ProgressRecord
}

export interface AdminOverview {
  user_count: number
  knowledge_count: number
  session_count: number
  message_count: number
  recent_sessions: Array<{
    session_id: string
    created_at: string
    message_count: number
  }>
  categories: Array<{ category: string; count: number; percentage: number }>
  hot_questions: Array<{ question: string; count: number }>
  metrics: {
    request_count: number
    avg_duration_ms: number
    slow_request_count: number
    error_count: number
    top_paths: Array<{ path: string; count: number }>
  }
  tfidf_ready?: boolean
  tfidf_last_reload_at?: number | null
}

export interface KnowledgeItem {
  id: number
  question: string
  answer: string
  category: string
  keywords: string
  weight: number
  is_active: number
  created_at?: string
  updated_at?: string
}

export interface AdminUser extends AuthUser {
  is_active: number
  created_at?: string
}
