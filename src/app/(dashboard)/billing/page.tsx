import { redirect } from 'next/navigation'
import { getCurrentUser, getBusiness } from '@/lib/supabase/queries'
import { createClient } from '@/lib/supabase/server'
import { startSubscription } from '@/lib/actions/billing'

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const business = await getBusiness(user.id)
  if (!business) redirect('/dashboard')

  const supabase = await createClient()
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('business_id', business.id)
    .single()

  const { payment } = await searchParams
  const paymentSuccess = payment === 'success'

  const now = new Date()
  const trialEnd = new Date(business.trial_ends_at)
  const trialDaysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000))
  const isTrial = business.subscription_status === 'trial'
  const isActive = business.subscription_status === 'active'
  const isExpired = !isTrial && !isActive

  const periodEnd = sub?.period_end ? new Date(sub.period_end) : null
  const periodDaysLeft = periodEnd
    ? Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / 86400000))
    : 0

  const messagesUsed = sub?.messages_used ?? 0
  const messagesLimit = sub?.messages_limit ?? 0
  const usagePercent = messagesLimit > 0 ? Math.min(100, Math.round((messagesUsed / messagesLimit) * 100)) : 0

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-1">Подписка</h1>
      <p className="text-sm text-zinc-400 mb-8">Тарифный план и использование</p>

      {paymentSuccess && (
        <div className="mb-6 rounded-xl bg-green-50 border border-green-200 p-4">
          <p className="text-sm font-medium text-green-900">Оплата прошла успешно!</p>
          <p className="text-sm text-green-700 mt-0.5">Подписка активирована на 30 дней.</p>
        </div>
      )}

      {/* Status card */}
      <div className={`rounded-xl p-6 mb-4 ${
        isActive ? 'bg-green-50 border border-green-200' :
        isTrial ? 'bg-blue-50 border border-blue-200' :
        'bg-red-50 border border-red-200'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-sm font-semibold ${
              isActive ? 'text-green-900' : isTrial ? 'text-blue-900' : 'text-red-900'
            }`}>
              {isActive && `Активна · ещё ${periodDaysLeft} ${daysLabel(periodDaysLeft)}`}
              {isTrial && (trialDaysLeft > 0
                ? `Пробный период · ещё ${trialDaysLeft} ${daysLabel(trialDaysLeft)}`
                : 'Пробный период истёк')}
              {isExpired && 'Подписка истекла'}
            </p>
            {isActive && periodEnd && (
              <p className={`text-xs mt-0.5 text-green-700`}>
                Следующее списание: {periodEnd.toLocaleDateString('ru-RU')}
              </p>
            )}
            {isTrial && trialDaysLeft > 0 && (
              <p className="text-xs mt-0.5 text-blue-700">
                Пробный доступ до {trialEnd.toLocaleDateString('ru-RU')}
              </p>
            )}
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
            isActive ? 'bg-green-100 text-green-800' :
            isTrial ? 'bg-blue-100 text-blue-800' :
            'bg-red-100 text-red-800'
          }`}>
            {isActive ? 'Starter' : isTrial ? 'Trial' : 'Истекла'}
          </span>
        </div>
      </div>

      {/* Usage */}
      {sub && (
        <div className="rounded-xl bg-white p-6 shadow-sm mb-4">
          <p className="text-sm font-medium text-zinc-900 mb-3">Использование за месяц</p>
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
            <span>Сообщений ИИ</span>
            <span>{messagesUsed} / {messagesLimit}</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                usagePercent >= 90 ? 'bg-red-500' :
                usagePercent >= 70 ? 'bg-amber-500' : 'bg-zinc-900'
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Plan & CTA */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-sm font-semibold text-zinc-900">Starter</p>
            <p className="text-xs text-zinc-500 mt-0.5">1 000 сообщений ИИ в месяц · неограниченные записи</p>
          </div>
          <p className="shrink-0 text-lg font-semibold text-zinc-900">1 490 ₽/мес</p>
        </div>

        {!isActive && (
          <form action={startSubscription}>
            <button
              type="submit"
              className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
            >
              {isExpired ? 'Возобновить подписку' : 'Подключить за 1 490 ₽/мес'}
            </button>
          </form>
        )}

        {isActive && (
          <p className="text-xs text-zinc-400 text-center">
            Для отмены подписки напишите нам в поддержку.
          </p>
        )}
      </div>
    </div>
  )
}

function daysLabel(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return 'день'
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'дня'
  return 'дней'
}
