export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Политика конфиденциальности</h1>
        <p className="text-sm text-zinc-400 mb-8">Последнее обновление: 2 марта 2026</p>

        <div className="prose prose-sm text-zinc-600 space-y-6">
          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">1. Стороны и роли</h2>
            <p>
              «Галя» — платформа для автоматизации функции администратора и онлайн-записи клиентов
              через Telegram. Правообладатель: Гордейчук Богдан, самозанятый.
              Контакт: <a href="mailto:comedi4@gmail.com" className="text-zinc-900 underline">comedi4@gmail.com</a>
            </p>
            <p className="mt-3">
              <strong>Владельцы бизнеса (Заказчики)</strong> — пользователи, которые регистрируются
              на платформе «Галя». В отношении их данных «Галя» является <strong>оператором</strong>{' '}
              персональных данных согласно 152-ФЗ.
            </p>
            <p className="mt-3">
              <strong>Клиенты бизнеса</strong> — лица, которые общаются с Telegram-ботом Заказчика.
              В отношении их данных «Галя» является <strong>обработчиком</strong> по поручению
              Заказчика (оператора). Ответственность перед клиентами бизнеса несёт Заказчик.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">2. Какие данные мы собираем</h2>
            <p><strong>Данные владельцев бизнеса:</strong></p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Email-адрес (для входа в систему)</li>
              <li>Название бизнеса, описание, адрес, телефон (вводятся вручную)</li>
              <li>Токен Telegram-бота (хранится в зашифрованном виде AES-256)</li>
            </ul>
            <p className="mt-3"><strong>Данные клиентов бизнеса (через Telegram-бот):</strong></p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Telegram ID (технический идентификатор)</li>
              <li>Имя (только то, которое клиент сообщил боту сам)</li>
              <li>История переписки с ботом</li>
              <li>Данные о записях: услуга, специалист, дата и время</li>
            </ul>
            <p className="mt-3 text-zinc-500 text-xs">
              Мы не собираем фамилии, номера телефонов (если клиент не сообщил их сам),
              платёжные данные клиентов бизнеса. Суммы фактических оплат нам неизвестны.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">3. Для чего мы используем данные</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Обеспечение работы сервиса онлайн-записи</li>
              <li>AI-обработка сообщений для ответов клиентам бизнеса</li>
              <li>Отправка напоминаний о записях</li>
              <li>Аналитика для владельца бизнеса (только его собственные данные)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">4. Где хранятся данные</h2>
            <p>
              Данные хранятся на серверах Supabase (Франкфурт, Германия) и
              обрабатываются Anthropic API (США) для генерации AI-ответов.
              При использовании сервиса вы даёте согласие на трансграничную передачу данных.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">5. Третьи стороны (субпроцессоры)</h2>
            <p>Данные передаются только следующим субпроцессорам в целях работы сервиса:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Supabase</strong> — хранение данных (EU GDPR compliant)</li>
              <li><strong>Anthropic</strong> — AI-обработка текстов диалогов</li>
              <li><strong>Telegram</strong> — доставка сообщений</li>
              <li><strong>YooKassa</strong> — обработка платежей подписки (платёжные данные мы не храним)</li>
            </ul>
            <p className="mt-3">
              Данные не передаются иным третьим лицам, за исключением случаев, прямо
              предусмотренных законодательством Российской Федерации.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">6. Ваши права</h2>
            <p><strong>Владельцы бизнеса (Заказчики) вправе:</strong></p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Удалить аккаунт и все данные через раздел «Биллинг» в личном кабинете</li>
              <li>Заморозить аккаунт с сохранением всех данных (раздел «Биллинг»)</li>
              <li>Запросить удаление данных по email:{' '}
                <a href="mailto:comedi4@gmail.com" className="text-zinc-900 underline">comedi4@gmail.com</a>
              </li>
            </ul>
            <p className="mt-3"><strong>Клиенты бизнеса</strong> направляют запросы на удаление
              своих данных непосредственно к владельцу бизнеса (оператору ПД). Владелец бизнеса
              может удалить данные клиента через раздел «Клиенты» в панели управления.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">7. Безопасность</h2>
            <p>
              Токены Telegram-ботов хранятся в зашифрованном виде (AES-256-CBC + уникальная соль).
              Доступ к данным ограничен политиками Row Level Security (RLS) на уровне базы данных.
              Платёжные данные не хранятся — обрабатываются напрямую YooKassa.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-100 flex gap-5">
          <a href="/register" className="text-sm text-zinc-500 hover:text-zinc-900">← Вернуться к регистрации</a>
          <a href="/offer" className="text-sm text-zinc-500 hover:text-zinc-900">Договор оферты</a>
        </div>
      </div>
    </div>
  )
}
