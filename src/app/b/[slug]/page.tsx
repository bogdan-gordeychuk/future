import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import type { Business, Service, Master } from '@/types/database'

export const revalidate = 3600

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createServiceClient()
  const { data: business } = await supabase
    .from('businesses')
    .select('name, description, city')
    .eq('slug', slug)
    .single<Pick<Business, 'name' | 'description' | 'city'>>()

  if (!business) return { title: 'Не найдено' }

  return {
    title: business.name,
    description: business.description ?? `Запись к ${business.name}${business.city ? ` в ${business.city}` : ''} через Telegram`,
  }
}

export default async function BusinessPublicPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createServiceClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, description, phone, address, city, telegram_bot_username')
    .eq('slug', slug)
    .single<Pick<Business, 'id' | 'name' | 'description' | 'phone' | 'address' | 'city' | 'telegram_bot_username'>>()

  if (!business) notFound()

  const [{ data: services }, { data: masters }] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, description, duration_minutes, price_kopecks')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('masters')
      .select('id, name')
      .eq('business_id', business.id)
      .eq('is_active', true),
  ])

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://future-weld.vercel.app'
  const pageUrl = `${appUrl}/b/${slug}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pageUrl)}`
  const botLink = business.telegram_bot_username
    ? `https://t.me/${business.telegram_bot_username}`
    : null

  return (
    <main className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-2xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900">{business.name}</h1>
          {business.description && (
            <p className="mt-2 text-zinc-500 text-sm">{business.description}</p>
          )}
          <div className="mt-2 flex items-center justify-center gap-4 text-xs text-zinc-400">
            {business.city && <span>{business.city}</span>}
            {business.address && <span>{business.address}</span>}
            {business.phone && (
              <a href={`tel:${business.phone}`} className="hover:text-zinc-700">
                {business.phone}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* CTA */}
        {botLink && (
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-5 text-center">
            <p className="text-sm text-blue-700 mb-3">
              Запись через Telegram — быстро и удобно
            </p>
            <a
              href={botLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Записаться в Telegram
            </a>
          </div>
        )}

        {/* Services */}
        {services && services.length > 0 && (
          <div className="rounded-xl bg-white border border-zinc-200 p-5">
            <h2 className="text-base font-semibold text-zinc-900 mb-4">Услуги</h2>
            <ul className="space-y-3">
              {(services as Service[]).map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{s.name}</p>
                    {s.description && (
                      <p className="text-xs text-zinc-400 mt-0.5">{s.description}</p>
                    )}
                    <p className="text-xs text-zinc-400 mt-0.5">{s.duration_minutes} мин</p>
                  </div>
                  <span className="text-sm font-semibold text-zinc-900 whitespace-nowrap">
                    {Math.round(s.price_kopecks / 100)} ₽
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Masters */}
        {masters && masters.length > 0 && (
          <div className="rounded-xl bg-white border border-zinc-200 p-5">
            <h2 className="text-base font-semibold text-zinc-900 mb-3">Мастера</h2>
            <ul className="flex flex-wrap gap-2">
              {(masters as Master[]).map((m) => (
                <li
                  key={m.id}
                  className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700"
                >
                  {m.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* QR code */}
        <div className="rounded-xl bg-white border border-zinc-200 p-5 text-center">
          <p className="text-xs text-zinc-400 mb-3">QR-код для этой страницы</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt="QR-код"
            width={150}
            height={150}
            className="mx-auto rounded-lg"
          />
          <p className="text-xs text-zinc-400 mt-2 break-all">{pageUrl}</p>
        </div>

        {/* Powered by */}
        <p className="text-center text-xs text-zinc-300 pb-4">
          Работает на{' '}
          <a href={appUrl} className="hover:text-zinc-500">
            ВИКА
          </a>
        </p>
      </div>
    </main>
  )
}
