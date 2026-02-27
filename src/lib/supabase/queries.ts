import { cache } from 'react'
import { createClient } from './server'
import type { Business } from '@/types/database'

/**
 * Fetches current user via getUser() — verifies JWT with Supabase Auth server.
 * Wrapped in React cache() to deduplicate across layout + page within one render.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ?? null
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
