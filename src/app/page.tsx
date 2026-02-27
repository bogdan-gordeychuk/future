import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-100">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-semibold text-zinc-900 tracking-tight">ВИКА</span>
          <div className="flex items-center gap-3">
            <Link href="/login"
              className="text-sm text-zinc-600 hover:text-zinc-900">
              Войти
            </Link>
            <Link href="/register"
              className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700">
              Попробовать бесплатно
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-2xl text-center">
          <div className="inline-block rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 mb-6">
            14 дней бесплатно · без карты
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-zinc-900 leading-tight mb-6">
            AI-помощник по записи клиентов в Telegram
          </h1>
          <p className="text-lg text-zinc-500 mb-10 max-w-xl mx-auto">
            Подключите своего Telegram-бота — ВИКА будет отвечать клиентам 24/7,
            записывать их и напоминать о визите. Без сотрудников на телефоне.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register"
              className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-700">
              Начать бесплатно
            </Link>
            <Link href="/login"
              className="rounded-lg border border-zinc-200 px-6 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
              Уже есть аккаунт
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-zinc-100 bg-zinc-50 py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-zinc-900 text-center mb-12">
            Как это работает
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            <Feature
              step="1"
              title="Создаёте бота"
              desc="Регистрируете бота через @BotFather в Telegram и вставляете токен в ВИКУ."
            />
            <Feature
              step="2"
              title="Настраиваете услуги"
              desc="Добавляете прайс, мастеров и FAQ. ВИКА сразу начинает отвечать на вопросы."
            />
            <Feature
              step="3"
              title="Клиенты записываются"
              desc="Клиент пишет в бот — ВИКА отвечает, записывает и напоминает о визите за 24 часа и за 1 час."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-6">
        <div className="max-w-sm mx-auto text-center">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-2">Один тариф</h2>
          <p className="text-sm text-zinc-400 mb-8">Без скрытых платежей</p>
          <div className="rounded-2xl border border-zinc-200 p-8">
            <p className="text-4xl font-bold text-zinc-900 mb-1">1 490 ₽</p>
            <p className="text-sm text-zinc-400 mb-6">в месяц</p>
            <ul className="text-sm text-zinc-600 space-y-2 text-left mb-8">
              {[
                '1 000 AI-сообщений в месяц',
                'Неограниченные записи',
                'Напоминания клиентам',
                'Dashboard с аналитикой',
                'База знаний для бота',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-zinc-400">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/register"
              className="block w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 text-center">
              Попробовать 14 дней бесплатно
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 py-6 px-6 text-center">
        <p className="text-xs text-zinc-400">© 2026 ВИКА · Telegram-ассистент для малого бизнеса</p>
      </footer>
    </div>
  )
}

function Feature({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="text-center">
      <div className="w-10 h-10 rounded-full bg-zinc-900 text-white text-sm font-semibold flex items-center justify-center mx-auto mb-4">
        {step}
      </div>
      <h3 className="text-sm font-semibold text-zinc-900 mb-2">{title}</h3>
      <p className="text-sm text-zinc-500">{desc}</p>
    </div>
  )
}
