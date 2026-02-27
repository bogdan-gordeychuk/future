'use client'

import { useActionState } from 'react'
import { register } from '@/lib/actions/auth'

const INPUT = 'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 placeholder:text-zinc-400'

export default function RegisterForm() {
  const [state, action, pending] = useActionState(register, { error: null })

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">Название бизнеса</label>
        <input type="text" name="business_name" placeholder="Студия Марины" required className={INPUT} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">Email</label>
        <input type="email" name="email" placeholder="you@example.com" required className={INPUT} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">Пароль</label>
        <input type="password" name="password" placeholder="Минимум 8 символов" minLength={8} required className={INPUT} />
      </div>

      <label className="flex items-start gap-2 cursor-pointer">
        <input type="checkbox" name="consent" required
          className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 accent-zinc-900 shrink-0" />
        <span className="text-xs text-zinc-500 leading-relaxed">
          Я согласен с{' '}
          <a href="/privacy" target="_blank" className="text-zinc-900 underline hover:no-underline">
            политикой конфиденциальности
          </a>{' '}
          и даю согласие на обработку персональных данных
        </span>
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
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
