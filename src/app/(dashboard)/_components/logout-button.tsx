'use client'

import { logout } from '@/lib/actions/auth'

export default function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="w-full text-left px-3 py-2 text-sm text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors"
      >
        Выйти
      </button>
    </form>
  )
}
