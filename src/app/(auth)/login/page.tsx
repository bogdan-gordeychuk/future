import LoginForm from './_form'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold text-zinc-900">Войти в Галю</h1>
        <p className="mb-6 text-sm text-zinc-500">AI-ассистент для записи клиентов</p>
        <LoginForm />
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
