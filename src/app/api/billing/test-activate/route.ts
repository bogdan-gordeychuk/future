import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// DEV ONLY — simulates a payment.succeeded webhook without YooKassa
// Usage: GET /api/billing/test-activate?business_id=UUID
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const businessId = req.nextUrl.searchParams.get('business_id')
  if (!businessId) {
    return NextResponse.json({ error: 'Missing business_id' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const now = new Date()
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

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
      yookassa_subscription_id: 'test_' + crypto.randomUUID(),
      updated_at: now.toISOString(),
    },
    { onConflict: 'business_id' }
  )

  await supabase
    .from('businesses')
    .update({ subscription_status: 'active' })
    .eq('id', businessId)

  return NextResponse.json({ ok: true, message: 'Subscription activated (test mode)', businessId })
}
