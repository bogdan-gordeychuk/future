export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold text-zinc-900">Войти в ВИКА</h1>
        <p className="mb-6 text-sm text-zinc-500">AI-ассистент для записи клиентов</p>
        <form className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Пароль</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            />
          </div>
          <button
            type="submit"
            className="mt-2 rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Войти
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-500">
          Нет аккаунта?{' '}
          <a href="/register" className="font-medium text-zinc-900 hover:underline">
            Зарегистрироваться
          </a>
        </p>
      </div>
    </div>
  )
}
