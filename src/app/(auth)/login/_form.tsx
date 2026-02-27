'use client'

import { useActionState } from 'react'
import { login } from '@/lib/actions/auth'

const INPUT = 'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 placeholder:text-zinc-400'

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, { error: null })

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">Email</label>
        <input type="email" name="email" placeholder="you@example.com" required className={INPUT} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">Пароль</label>
        <input type="password" name="password" placeholder="Минимум 8 символов" required className={INPUT} />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? 'Вход...' : 'Войти'}
      </button>
    </form>
  )
}
