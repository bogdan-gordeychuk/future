export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900">ВИКА</h1>
        <p className="mb-8 text-sm text-zinc-500">AI-ассистент для записи клиентов</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Записей сегодня</p>
            <p className="mt-1 text-3xl font-semibold text-zinc-900">0</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Новых клиентов</p>
            <p className="mt-1 text-3xl font-semibold text-zinc-900">0</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Сообщений за месяц</p>
            <p className="mt-1 text-3xl font-semibold text-zinc-900">0</p>
          </div>
        </div>
        <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-700">Следующий шаг</p>
          <p className="mt-1 text-zinc-500">Подключите Telegram-бота в настройках, чтобы начать принимать записи.</p>
          <a
            href="/settings"
            className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Настроить бота
          </a>
        </div>
      </div>
    </div>
  )
}
