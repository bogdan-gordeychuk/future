export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Политика конфиденциальности</h1>
        <p className="text-sm text-zinc-400 mb-8">Последнее обновление: 27 февраля 2026</p>

        <div className="prose prose-sm text-zinc-600 space-y-6">
          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">1. Кто мы</h2>
            <p>
              ВИКА — сервис AI-ассистента для онлайн-записи клиентов через Telegram.
              Оператор персональных данных: Гордейчук Богдан, самозанятый.
              Контакт: <a href="mailto:comedi4@gmail.com" className="text-zinc-900 underline">comedi4@gmail.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">2. Какие данные мы собираем</h2>
            <p><strong>Данные владельцев бизнеса:</strong></p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Email-адрес (для входа в систему)</li>
              <li>Название бизнеса, описание, адрес, телефон (вводятся вручную)</li>
              <li>Токен Telegram-бота (хранится в зашифрованном виде)</li>
            </ul>
            <p className="mt-3"><strong>Данные клиентов бизнеса (через Telegram):</strong></p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Telegram ID, имя, фамилия, username (публичные данные Telegram)</li>
              <li>Номер телефона (только если клиент сам его сообщил боту)</li>
              <li>История переписки с ботом</li>
              <li>Данные о записях (услуга, мастер, дата)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">3. Для чего мы используем данные</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Обеспечение работы сервиса онлайн-записи</li>
              <li>AI-обработка сообщений для ответов клиентам бизнеса</li>
              <li>Отправка напоминаний о записях</li>
              <li>Улучшение качества сервиса</li>
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
            <h2 className="text-base font-semibold text-zinc-900 mb-2">5. Третьи стороны</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Supabase</strong> — хранение данных (EU GDPR compliant)</li>
              <li><strong>Anthropic</strong> — обработка сообщений AI (тексты диалогов)</li>
              <li><strong>Telegram</strong> — доставка сообщений</li>
              <li><strong>YooKassa</strong> — обработка платежей (платёжные данные мы не храним)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">6. Ваши права</h2>
            <p>
              Вы можете запросить удаление своих данных, написав на{' '}
              <a href="mailto:comedi4@gmail.com" className="text-zinc-900 underline">comedi4@gmail.com</a>.
              Данные удаляются в течение 30 дней.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">7. Безопасность</h2>
            <p>
              Токены Telegram-ботов хранятся в зашифрованном виде (AES-256).
              Доступ к данным ограничен политиками Row Level Security (RLS).
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
