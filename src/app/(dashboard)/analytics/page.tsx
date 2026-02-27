import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getBusiness } from '@/lib/supabase/queries'

function formatRub(kopecks: number): string {
  return (kopecks / 100).toLocaleString('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  })
}

export default async function AnalyticsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const business = await getBusiness(user.id)

  if (!business) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-sm text-center">
        <p className="text-zinc-500">Бизнес не найден. Пожалуйста, зарегистрируйтесь заново.</p>
      </div>
    )
  }

  const supabase = await createClient()
  const businessId = business.id

  // Date helpers
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10) // YYYY-MM-DD
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10)

  const [
    { data: todayBookings },
    { data: monthBookings },
    { count: totalClients },
    { data: last7daysRaw },
  ] = await Promise.all([
    // Today's bookings (confirmed + completed)
    supabase
      .from('bookings')
      .select('*')
      .eq('business_id', businessId)
      .gte('scheduled_at', `${todayStr}T00:00:00`)
      .lt('scheduled_at', `${todayStr}T23:59:59`)
      .in('status', ['confirmed', 'completed']),

    // This month's bookings with service and master names
    supabase
      .from('bookings')
      .select('*, services(name), masters(name)')
      .eq('business_id', businessId)
      .gte('scheduled_at', monthStart)
      .in('status', ['confirmed', 'completed']),

    // Total clients count
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId),

    // Last 7 days bookings for activity chart
    supabase
      .from('bookings')
      .select('scheduled_at')
      .eq('business_id', businessId)
      .gte('scheduled_at', `${sevenDaysAgoStr}T00:00:00`)
      .in('status', ['confirmed', 'completed']),
  ])

  // Calculate revenue
  const todayRevenue = (todayBookings ?? []).reduce(
    (sum, b) => sum + (b.price_kopecks ?? 0),
    0
  )
  const monthRevenue = (monthBookings ?? []).reduce(
    (sum, b) => sum + (b.price_kopecks ?? 0),
    0
  )

  // Top services — group by service name in JS
  const serviceCountMap: Record<string, number> = {}
  for (const booking of monthBookings ?? []) {
    const svc = booking.services as { name: string } | null
    const name = svc?.name ?? 'Без услуги'
    serviceCountMap[name] = (serviceCountMap[name] ?? 0) + 1
  }
  const topServices = Object.entries(serviceCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  // Top masters — group by master name in JS
  const masterCountMap: Record<string, number> = {}
  for (const booking of monthBookings ?? []) {
    const mst = booking.masters as { name: string } | null
    const name = mst?.name ?? 'Без мастера'
    masterCountMap[name] = (masterCountMap[name] ?? 0) + 1
  }
  const topMasters = Object.entries(masterCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  // Last 7 days activity — group by date in JS
  const activityMap: Record<string, number> = {}
  // Pre-fill all 7 days with 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo)
    d.setDate(d.getDate() + i)
    activityMap[d.toISOString().slice(0, 10)] = 0
  }
  for (const booking of last7daysRaw ?? []) {
    const date = booking.scheduled_at.slice(0, 10)
    if (date in activityMap) {
      activityMap[date] = (activityMap[date] ?? 0) + 1
    }
  }
  const activityRows = Object.entries(activityMap).sort((a, b) => a[0].localeCompare(b[0]))

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-1">Аналитика</h1>
      <p className="text-sm text-zinc-400 mb-8">Статистика по записям и выручке</p>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-zinc-500">Сегодня</p>
          <p className="mt-1 text-3xl font-semibold text-zinc-900">{(todayBookings ?? []).length}</p>
          <p className="mt-1 text-sm text-zinc-400">записей · {formatRub(todayRevenue)}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-zinc-500">Этот месяц</p>
          <p className="mt-1 text-3xl font-semibold text-zinc-900">{(monthBookings ?? []).length}</p>
          <p className="mt-1 text-sm text-zinc-400">записей · {formatRub(monthRevenue)}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-zinc-500">Клиентов</p>
          <p className="mt-1 text-3xl font-semibold text-zinc-900">{totalClients ?? 0}</p>
          <p className="mt-1 text-sm text-zinc-400">всего в базе</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-6">
        {/* Top services */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-900 mb-4">Популярные услуги</p>
          {topServices.length === 0 ? (
            <p className="text-sm text-zinc-400">Нет данных за этот месяц</p>
          ) : (
            <ul className="space-y-2">
              {topServices.map(([name, count]) => (
                <li key={name} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-700 truncate mr-2">{name}</span>
                  <span className="shrink-0 inline-flex items-center justify-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top masters */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-900 mb-4">Мастера (этот месяц)</p>
          {topMasters.length === 0 ? (
            <p className="text-sm text-zinc-400">Нет данных за этот месяц</p>
          ) : (
            <ul className="space-y-2">
              {topMasters.map(([name, count]) => (
                <li key={name} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-700 truncate mr-2">{name}</span>
                  <span className="shrink-0 inline-flex items-center justify-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 7-day activity */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-zinc-900 mb-4">Активность за 7 дней</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100">
              <th className="text-left pb-2 font-medium text-zinc-500">Дата</th>
              <th className="text-right pb-2 font-medium text-zinc-500">Кол-во записей</th>
            </tr>
          </thead>
          <tbody>
            {activityRows.map(([date, count]) => (
              <tr key={date} className="border-b border-zinc-50 last:border-0">
                <td className="py-2 text-zinc-700">{formatDate(date)}</td>
                <td className="py-2 text-right">
                  <span className={`font-medium ${count > 0 ? 'text-zinc-900' : 'text-zinc-300'}`}>
                    {count}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
