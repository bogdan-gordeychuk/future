// Auto-generated types for Supabase tables
// Update after schema changes with: npx supabase gen types typescript

export type SubscriptionStatus = 'trial' | 'active' | 'cancelled' | 'expired'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
export type MessageRole = 'user' | 'assistant' | 'system'
export type SubscriptionPlan = 'trial' | 'starter' | 'pro'

export interface WorkingHoursDay {
  start: string // "09:00"
  end: string   // "21:00"
  enabled: boolean
}

export interface BusinessSettings {
  auto_reply_enabled: boolean
  welcome_message: string
  escalation_keywords: string[]
  notification_telegram_id?: string | null
  timezone?: string
  working_hours: {
    mon: WorkingHoursDay
    tue: WorkingHoursDay
    wed: WorkingHoursDay
    thu: WorkingHoursDay
    fri: WorkingHoursDay
    sat: WorkingHoursDay
    sun: WorkingHoursDay
  }
}

export interface User {
  id: string
  email: string
  name: string | null
  telegram_user_id: number | null
  created_at: string
}

export interface Business {
  id: string
  owner_id: string
  name: string
  description: string | null
  phone: string | null
  address: string | null
  city: string | null
  telegram_bot_token: string | null
  telegram_bot_username: string | null
  settings: BusinessSettings
  subscription_status: SubscriptionStatus
  trial_ends_at: string
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  business_id: string
  name: string
  description: string | null
  duration_minutes: number
  price_kopecks: number
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface Master {
  id: string
  business_id: string
  name: string
  telegram_user_id: number | null
  is_active: boolean
  created_at: string
}

export interface WorkingHours {
  id: string
  master_id: string
  day_of_week: number // 0=Mon, 6=Sun
  start_time: string
  end_time: string
  is_working: boolean
}

export interface ScheduleOverride {
  id: string
  master_id: string
  date: string
  is_blocked: boolean
  reason: string | null
}

export interface Client {
  id: string
  business_id: string
  telegram_user_id: number
  telegram_username: string | null
  first_name: string | null
  last_name: string | null
  preferred_name: string | null
  phone: string | null
  notes: string | null
  visit_count: number
  last_visit_at: string | null
  created_at: string
}

export interface Booking {
  id: string
  business_id: string
  master_id: string | null
  service_id: string | null
  client_id: string
  scheduled_at: string
  duration_minutes: number
  price_kopecks: number
  status: BookingStatus
  notes: string | null
  reminder_24h_sent_at: string | null
  reminder_1h_sent_at: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  business_id: string
  client_id: string
  role: MessageRole
  content: string
  tokens_used: number
  created_at: string
}

export interface KnowledgeItem {
  id: string
  business_id: string
  question: string
  answer: string
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface Subscription {
  id: string
  business_id: string
  plan: SubscriptionPlan
  status: 'active' | 'cancelled' | 'past_due' | 'expired'
  yookassa_subscription_id: string | null
  messages_limit: number // -1 = unlimited
  messages_used: number
  period_start: string
  period_end: string
  price_kopecks: number
  created_at: string
  updated_at: string
}
