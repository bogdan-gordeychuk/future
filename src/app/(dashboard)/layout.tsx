import { redirect } from 'next/navigation'
import { getCurrentUser, getBusiness } from '@/lib/supabase/queries'
import Nav from './_components/nav'
import LogoutButton from './_components/logout-button'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const business = await getBusiness(user.id)

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <aside className="w-52 shrink-0 border-r border-zinc-200 bg-white flex flex-col">
        <div className="px-5 py-4 border-b border-zinc-100">
          <span className="font-semibold text-zinc-900 text-sm">ВИКА</span>
          {business?.name && (
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
