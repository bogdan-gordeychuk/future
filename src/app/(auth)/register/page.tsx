import RegisterForm from './_form'

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold text-zinc-900">Создать аккаунт</h1>
        <p className="mb-6 text-sm text-zinc-500">Подключите своего AI-ассистента за 5 минут</p>
        <RegisterForm />
        <p className="mt-4 text-center text-sm text-zinc-500">
          Уже есть аккаунт?{' '}
          <a href="/login" className="font-medium text-zinc-900 hover:underline">
            Войти
          </a>
        </p>
      </div>
    </div>
  )
}
