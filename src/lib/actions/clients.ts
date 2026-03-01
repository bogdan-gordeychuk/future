'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function anonymizeClient(
  clientId: string
): Promise<{ error: string | null; success: boolean }> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Не авторизован', success: false }

  // Verify client belongs to this business owner
  const { data: client } = await supabase
    .from('clients')
    .select('id, business_id')
    .eq('id', clientId)
    .single()

  if (!client) return { error: 'Клиент не найден', success: false }

  const serviceSupabase = await createServiceClient()

  // Anonymize: clear name fields
  await serviceSupabase
    .from('clients')
    .update({
      preferred_name: null,
      first_name: null,
      last_name: null,
      telegram_username: null,
      phone: null,
      notes: null,
    })
    .eq('id', clientId)

  // Delete message history
  await serviceSupabase
    .from('messages')
    .delete()
    .eq('client_id', clientId)

  // Detach bookings from client (keep for analytics, just remove link)
  await serviceSupabase
    .from('bookings')
    .update({ client_id: null })
    .eq('client_id', clientId)

  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/clients')
  return { error: null, success: true }
}
