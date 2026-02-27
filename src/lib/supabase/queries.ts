import { cache } from 'react'
import { createClient } from './server'
import type { Business } from '@/types/database'

/**
 * Reads current user from session cookie — no network call.
 * Proxy (proxy.ts) already verified the JWT; components trust that.
 * Wrapped in React cache() to deduplicate across layout + page within one render.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
})

/**
 * Fetches business by owner. Wrapped in React cache() so layout and page
 * share the same DB result within one server render — zero duplicate queries.
 */
export const getBusiness = cache(async (userId: string): Promise<Business | null> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', userId)
    .single<Business>()
  return data
})
