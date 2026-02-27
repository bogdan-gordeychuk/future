export default function OfferPage() {
  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Договор публичной оферты</h1>
        <p className="text-sm text-zinc-400 mb-8">Последнее обновление: 28 февраля 2026</p>

        <div className="prose prose-sm text-zinc-600 space-y-6">
          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">1. Общие положения</h2>
            <p>
              Настоящий документ является публичной офертой Гордейчука Богдана, самозанятого
              (далее — «Исполнитель»), адресованной любому физическому или юридическому лицу
              (далее — «Заказчик») на использование сервиса ВИКА — AI-ассистента для онлайн-записи
              клиентов через Telegram.
            </p>
            <p className="mt-3">
              Совершение Заказчиком акцепта (регистрация на сайте, оплата подписки) означает полное
              и безоговорочное принятие условий настоящего договора в соответствии с{' '}
              <a href="https://www.consultant.ru/document/cons_doc_LAW_5142/9f3e72b1ab0f6e44ae0d57e48e15a6bc2c2a7eaa/"
                className="text-zinc-900 underline" target="_blank" rel="noopener noreferrer">
                ст. 437, 438 ГК РФ
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">2. Предмет договора</h2>
            <p>
              Исполнитель предоставляет Заказчику доступ к сервису ВИКА на условиях подписки.
              Сервис включает:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>AI-ассистента в Telegram для автоматической онлайн-записи клиентов</li>
              <li>Панель управления: услуги, мастера, записи, база знаний</li>
              <li>Уведомления о новых записях</li>
              <li>Напоминания клиентам за 24 часа и 1 час до записи</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">3. Условия подписки и оплаты</h2>
            <p>
              Сервис предоставляется на условиях ежемесячной подписки. Действующие тарифы
              опубликованы на сайте{' '}
              <a href="https://future-weld.vercel.app" className="text-zinc-900 underline">
                future-weld.vercel.app
              </a>{' '}
              и могут быть изменены Исполнителем с уведомлением за 7 дней.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Пробный период:</strong> 14 дней бесплатно, до 400 сообщений</li>
              <li><strong>Оплата:</strong> через YooKassa. Списание в начале расчётного периода</li>
              <li><strong>Возврат:</strong> при первой оплате — в течение 3 дней с момента оплаты</li>
              <li>Подписка продлевается автоматически. Отменить можно в личном кабинете</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">4. Права и обязанности сторон</h2>
            <p><strong>Исполнитель обязуется:</strong></p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Обеспечивать доступность сервиса не менее 95% времени в месяц</li>
              <li>Не передавать данные Заказчика третьим лицам, кроме субпроцессоров (Supabase, Anthropic, Telegram, YooKassa)</li>
              <li>Уведомлять об изменениях тарифов за 7 дней по email</li>
            </ul>
            <p className="mt-3"><strong>Заказчик обязуется:</strong></p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Использовать сервис только в законных целях</li>
              <li>Не передавать доступ к аккаунту третьим лицам</li>
              <li>Самостоятельно получать согласия своих клиентов на обработку персональных данных</li>
              <li>Своевременно вносить абонентскую плату</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">5. Ограничение ответственности</h2>
            <p>
              Сервис предоставляется «как есть». Исполнитель не несёт ответственности за:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Убытки, возникшие вследствие некорректных ответов AI-ассистента</li>
              <li>Перебои в работе Telegram, YooKassa, Anthropic API</li>
              <li>Действия клиентов Заказчика в Telegram</li>
            </ul>
            <p className="mt-3">
              Максимальная ответственность Исполнителя ограничена суммой платежей Заказчика
              за последние 30 дней.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">6. Персональные данные</h2>
            <p>
              Обработка персональных данных осуществляется в соответствии с{' '}
              <a href="/privacy" className="text-zinc-900 underline">
                Политикой конфиденциальности
              </a>{' '}
              и Федеральным законом № 152-ФЗ «О персональных данных».
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">7. Расторжение договора</h2>
            <p>
              Заказчик вправе расторгнуть договор в любое время, отменив подписку в личном кабинете.
              Доступ сохраняется до конца оплаченного периода.
            </p>
            <p className="mt-3">
              Исполнитель вправе расторгнуть договор в одностороннем порядке при нарушении
              Заказчиком условий настоящего договора, уведомив по email за 3 дня.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">8. Разрешение споров</h2>
            <p>
              Споры решаются путём переговоров. При недостижении соглашения — в судебном порядке
              по месту нахождения Исполнителя (г. Омск) в соответствии с законодательством РФ.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-2">9. Реквизиты исполнителя</h2>
            <p>
              Гордейчук Богдан, самозанятый<br />
              г. Омск, Россия<br />
              Email:{' '}
              <a href="mailto:comedi4@gmail.com" className="text-zinc-900 underline">
                comedi4@gmail.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-100 flex gap-5">
          <a href="/" className="text-sm text-zinc-500 hover:text-zinc-900">← На главную</a>
          <a href="/privacy" className="text-sm text-zinc-500 hover:text-zinc-900">Политика конфиденциальности</a>
        </div>
      </div>
    </div>
  )
}
