'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createPayment } from '@/lib/yookassa/client'

const PLAN_PRICE_KOPECKS = 149000 // 1490₽

export async function startSubscription(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()

  if (!business) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  const payment = await createPayment({
    amountKopecks: PLAN_PRICE_KOPECKS,
    description: `Подписка ВИКА на 30 дней — ${business.name}`,
    returnUrl: `${appUrl}/billing?payment=success`,
    metadata: { business_id: business.id },
  })

  redirect(payment.confirmation!.confirmation_url)
}
