'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createPayment } from '@/lib/yookassa/client'

const PLAN_PRICE_KOPECKS = 149000 // 1490₽

export async function startSubscription(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()

  if (!business) redirect('/dashboard')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  let paymentUrl: string | null = null

  try {
    const payment = await createPayment({
      amountKopecks: PLAN_PRICE_KOPECKS,
      description: `Подписка «Галя» на 30 дней — ${business.name}`,
      returnUrl: `${appUrl}/billing?payment=success`,
      metadata: { business_id: business.id },
    })
    paymentUrl = payment.confirmation?.confirmation_url ?? null
  } catch (err) {
    console.error('[billing] createPayment error:', err instanceof Error ? err.message : err)
  }

  // redirect() must be called outside try/catch so NEXT_REDIRECT propagates correctly
  if (paymentUrl) {
    redirect(paymentUrl)
  } else {
    redirect('/billing?payment=error')
  }
}
