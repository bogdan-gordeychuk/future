import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Nav from './_components/nav'
import LogoutButton from './_components/logout-button'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('name')
    .eq('owner_id', user.id)
    .single()

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <aside className="w-52 shrink-0 border-r border-zinc-200 bg-white flex flex-col">
        <div className="px-5 py-4 border-b border-zinc-100">
          <span className="font-semibold text-zinc-900 text-sm">ВИКА</span>
          {business && (
            <p className="text-xs text-zinc-400 mt-0.5 truncate">{business.name}</p>
          )}
        </div>
        <Nav />
        <div className="p-3 border-t border-zinc-100">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 p-8 max-w-4xl">{children}</main>
    </div>
  )
}
