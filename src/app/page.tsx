import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold text-zinc-900 tracking-tight">ВИКА</span>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-zinc-600 hover:text-zinc-900">
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
      <section className="flex items-center justify-center px-6 py-20 sm:py-28">
        <div className="max-w-2xl text-center">
          <div className="inline-block rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 mb-6">
            14 дней бесплатно · без карты · для малого бизнеса
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-zinc-900 leading-tight mb-5">
            Ваш Telegram-бот,<br className="hidden sm:block" /> который записывает клиентов
          </h1>
          <p className="text-lg text-zinc-500 mb-4 max-w-xl mx-auto">
            Подключите бота — ВИКА ответит на вопросы, запишет клиента и напомнит о визите.
            Всё это без вашего участия, 24/7.
          </p>
          <p className="text-sm text-zinc-400 mb-10">
            Клиент пишет «хочу записаться» → бот уточняет услугу и время → заявка приходит вам в Telegram
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register"
              className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-700">
              Начать бесплатно →
            </Link>
            <Link href="/login"
              className="rounded-lg border border-zinc-200 px-6 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
              Уже есть аккаунт
            </Link>
          </div>
        </div>
      </section>

      {/* For whom */}
      <section className="border-t border-zinc-100 py-14 px-6 bg-zinc-50">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs font-medium text-zinc-400 uppercase tracking-widest mb-8">
            Подходит для
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              'Барбершопы', 'Nail-студии', 'Массажные кабинеты',
              'Репетиторы', 'Фотографы', 'Тренеры',
              'Салоны красоты', 'Косметологи', 'Психологи',
            ].map((name) => (
              <span key={name}
                className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-sm text-zinc-600">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-zinc-900 text-center mb-3">Как это работает</h2>
          <p className="text-sm text-zinc-400 text-center mb-14">Настройка занимает 15 минут</p>
          <div className="grid sm:grid-cols-4 gap-8">
            <Step step="1" title="Создаёте бота"
              desc="Регистрируете бота через @BotFather и вставляете токен в ВИКУ." />
            <Step step="2" title="Настраиваете услуги"
              desc="Добавляете прайс, мастеров и ответы на частые вопросы." />
            <Step step="3" title="Клиент пишет в бот"
              desc="ВИКА отвечает, уточняет детали и создаёт заявку на запись." />
            <Step step="4" title="Вы подтверждаете"
              desc="Заявка приходит в Telegram. Нажимаете «Подтвердить» — клиент получает уведомление." />
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="border-t border-zinc-100 bg-zinc-50 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold text-zinc-900 text-center mb-14">Что умеет ВИКА</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <FeatureCard
              icon="💬"
              title="Отвечает на вопросы"
              desc="Цены, услуги, адрес, свободное время — клиент получает ответ мгновенно в любое время."
            />
            <FeatureCard
              icon="📅"
              title="Принимает заявки"
              desc="Уточняет услугу и желаемое время, создаёт заявку. Вы подтверждаете одним нажатием."
            />
            <FeatureCard
              icon="⏰"
              title="Напоминает о визите"
              desc="Автоматически отправляет напоминания за 24 часа и за 1 час до записи."
            />
            <FeatureCard
              icon="📋"
              title="Панель управления"
              desc="Все записи в одном месте: предстоящие, ожидающие подтверждения, история."
            />
            <FeatureCard
              icon="🤖"
              title="База знаний"
              desc="Добавьте ответы на типичные вопросы — бот будет использовать их в разговоре."
            />
            <FeatureCard
              icon="🔔"
              title="Уведомления владельцу"
              desc="Новая заявка на запись — вы получаете Telegram-сообщение с деталями."
            />
          </div>
        </div>
      </section>

      {/* vs competitors */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-zinc-900 text-center mb-3">Зачем ВИКА, если есть другие сервисы?</h2>
          <p className="text-sm text-zinc-400 text-center mb-12">Конкуренты делают виджет записи. ВИКА — живой разговор.</p>
          <div className="rounded-2xl border border-zinc-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="text-left px-5 py-3 font-medium text-zinc-500">Функция</th>
                  <th className="px-5 py-3 font-semibold text-zinc-900 text-center">ВИКА</th>
                  <th className="px-5 py-3 font-medium text-zinc-400 text-center">YCLIENTS / DIKIDI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {[
                  ['Запись через Telegram', '✓', '—'],
                  ['AI отвечает на вопросы 24/7', '✓', '—'],
                  ['Не нужен отдельный виджет/сайт', '✓', '✗'],
                  ['Напоминания клиентам', '✓', '✓'],
                  ['Подтверждение заявок', '✓', '✓'],
                  ['Стоимость', '1 490 ₽/мес', 'от 771 ₽/мес'],
                ].map(([feat, us, them]) => (
                  <tr key={feat}>
                    <td className="px-5 py-3 text-zinc-700">{feat}</td>
                    <td className="px-5 py-3 text-center font-medium text-green-600">{us}</td>
                    <td className="px-5 py-3 text-center text-zinc-400">{them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-zinc-100 bg-zinc-50 py-20 px-6">
        <div className="max-w-sm mx-auto text-center">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-2">Один тариф. Всё включено.</h2>
          <p className="text-sm text-zinc-400 mb-10">Без скрытых платежей и ограничений по количеству клиентов</p>
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
            <div className="mb-1">
              <span className="text-4xl font-bold text-zinc-900">1 490 ₽</span>
            </div>
            <p className="text-sm text-zinc-400 mb-2">в месяц</p>
            <p className="text-xs text-green-600 font-medium mb-7">14 дней бесплатно при регистрации</p>
            <ul className="text-sm text-zinc-600 space-y-2.5 text-left mb-8">
              {[
                '1 000 AI-сообщений в месяц',
                'Неограниченные заявки на запись',
                'Напоминания за 24ч и 1ч',
                'Панель управления записями',
                'База знаний для бота',
                'Уведомления в Telegram',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-zinc-400 shrink-0">✓</span> {f}
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

      {/* FAQ */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold text-zinc-900 text-center mb-12">Частые вопросы</h2>
          <div className="space-y-6">
            {[
              {
                q: 'Нужно ли иметь Telegram-бота?',
                a: 'Да, но это бесплатно и занимает 2 минуты: откройте @BotFather в Telegram, напишите /newbot, получите токен и вставьте его в ВИКУ.',
              },
              {
                q: 'Клиенты смогут записаться без Telegram?',
                a: 'Нет, ВИКА работает только через Telegram. Если ваши клиенты преимущественно там — всё отлично.',
              },
              {
                q: 'Что происходит после 1 000 сообщений?',
                a: 'Бот вежливо сообщает клиенту, что лимит исчерпан и предлагает связаться напрямую. Заявки на запись продолжают приниматься.',
              },
              {
                q: 'Как клиент записывается?',
                a: 'Клиент пишет в бот в свободной форме: «хочу записаться на стрижку в пятницу». ВИКА уточняет детали и создаёт заявку. Вы получаете уведомление и подтверждаете одним нажатием — клиент получает подтверждение в Telegram.',
              },
              {
                q: 'Что будет, если я не подтвержу заявку?',
                a: 'Заявка остаётся в статусе "Ожидает". Напоминания будут отправлены клиенту в любом случае.',
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-zinc-100 pb-6">
                <p className="text-sm font-semibold text-zinc-900 mb-2">{q}</p>
                <p className="text-sm text-zinc-500">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA bottom */}
      <section className="border-t border-zinc-100 bg-zinc-900 py-16 px-6 text-center">
        <h2 className="text-2xl font-semibold text-white mb-3">Готовы попробовать?</h2>
        <p className="text-sm text-zinc-400 mb-8">14 дней бесплатно. Настройка за 15 минут. Отмена в любой момент.</p>
        <Link href="/register"
          className="inline-block rounded-lg bg-white px-8 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100">
          Создать аккаунт бесплатно →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-900 py-6 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-500">© 2026 ВИКА · Telegram-ассистент для малого бизнеса</p>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="text-xs text-zinc-500 hover:text-zinc-300">
              Политика конфиденциальности
            </Link>
            <a href="mailto:comedi4@gmail.com" className="text-xs text-zinc-500 hover:text-zinc-300">
              comedi4@gmail.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Step({ step, title, desc }: { step: string; title: string; desc: string }) {
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

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl bg-white border border-zinc-100 p-5 shadow-sm">
      <div className="text-2xl mb-3">{icon}</div>
      <h3 className="text-sm font-semibold text-zinc-900 mb-1.5">{title}</h3>
      <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
    </div>
  )
}
