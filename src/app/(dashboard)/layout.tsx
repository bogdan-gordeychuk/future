import { redirect } from 'next/navigation'
import { getCurrentUser, getBusiness } from '@/lib/supabase/queries'
import Nav from './_components/nav'
import LogoutButton from './_components/logout-button'
import MobileNav from './_components/mobile-nav'

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
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-52 shrink-0 border-r border-zinc-200 bg-white flex-col">
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
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-zinc-200">
          <span className="font-semibold text-zinc-900 text-sm">ВИКА</span>
          {business?.name && (
            <span className="text-xs text-zinc-400 truncate max-w-[150px]">{business.name}</span>
          )}
        </header>
        <main className="flex-1 p-4 md:p-8 max-w-4xl overflow-x-auto">{children}</main>
        {/* Mobile bottom navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 z-50">
          <MobileNav />
        </nav>
        {/* Spacer for mobile bottom nav */}
        <div className="md:hidden h-16" />
      </div>
    </div>
  )
}
