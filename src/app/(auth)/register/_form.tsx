'use client'

import { useActionState } from 'react'
import { register } from '@/lib/actions/auth'

export default function RegisterForm() {
  const [state, action, pending] = useActionState(register, { error: null })

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">Название бизнеса</label>
        <input
          type="text"
          name="business_name"
          placeholder="Барбершоп «Иван»"
          required
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">Email</label>
        <input
          type="email"
          name="email"
          placeholder="you@example.com"
          required
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">Пароль</label>
        <input
          type="password"
          name="password"
          placeholder="Минимум 8 символов"
          minLength={8}
          required
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
        />
      </div>
      {state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? 'Создание аккаунта...' : 'Зарегистрироваться'}
      </button>
    </form>
  )
}
