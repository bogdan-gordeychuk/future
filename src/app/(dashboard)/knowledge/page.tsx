import { redirect } from 'next/navigation'
import { getCurrentUser, getBusiness } from '@/lib/supabase/queries'
import { createClient } from '@/lib/supabase/server'
import { AddKnowledgeForm, KnowledgeRow } from './_form'
import type { KnowledgeItem } from '@/types/database'

export default async function KnowledgePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const business = await getBusiness(user.id)
  if (!business) redirect('/dashboard')

  const supabase = await createClient()
  const { data: items } = await supabase
    .from('knowledge_items')
    .select('*')
    .eq('business_id', business.id)
    .order('sort_order')
    .order('created_at')

  return (
    <div>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">База знаний</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Вопросы и ответы, которые ВИКА использует при общении с клиентами
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-8">
        <p className="text-xs text-amber-800">
          <span className="font-medium">Совет:</span> Добавьте ответы на частые вопросы ваших клиентов.
          Чем больше здесь информации — тем точнее отвечает ВИКА.
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {(items as KnowledgeItem[] ?? []).map((item) => (
          <KnowledgeRow key={item.id} item={item} />
        ))}
        {(!items || items.length === 0) && (
          <div className="rounded-xl bg-white p-8 shadow-sm text-center">
            <p className="text-zinc-400 text-sm">База знаний пуста.</p>
            <p className="text-zinc-400 text-xs mt-1">
              Добавьте первый вопрос-ответ — бот станет умнее.
            </p>
          </div>
        )}
      </div>

      <AddKnowledgeForm />
    </div>
  )
}
