import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getPayment } from '@/lib/yookassa/client'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let body: { event?: string; object?: { id?: string; metadata?: Record<string, string> } }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Only handle succeeded payments
  if (body.event !== 'payment.succeeded') {
    return NextResponse.json({ ok: true })
  }

  const paymentId = body.object?.id
  const businessId = body.object?.metadata?.business_id

  if (!paymentId || !businessId) {
    return NextResponse.json({ ok: true })
  }

  // Verify payment status with YooKassa (prevents spoofed webhooks)
  try {
    const payment = await getPayment(paymentId)
    if (payment.status !== 'succeeded') {
      return NextResponse.json({ ok: true })
    }
  } catch {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }

  const supabase = await createServiceClient()
  const now = new Date()
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  // Upsert subscription record
  await supabase.from('subscriptions').upsert(
    {
      business_id: businessId,
      plan: 'starter',
      status: 'active',
      messages_limit: 1000,
      messages_used: 0,
      period_start: now.toISOString(),
      period_end: periodEnd.toISOString(),
      price_kopecks: 149000,
      yookassa_subscription_id: paymentId,
      updated_at: now.toISOString(),
    },
    { onConflict: 'business_id' }
  )

  // Update business subscription status
  await supabase
    .from('businesses')
    .update({ subscription_status: 'active' })
    .eq('id', businessId)

  return NextResponse.json({ ok: true })
}
