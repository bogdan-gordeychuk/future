const BASE_URL = 'https://api.yookassa.ru/v3'

function authHeaders() {
  const creds = Buffer.from(
    `${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET_KEY}`
  ).toString('base64')
  return {
    Authorization: `Basic ${creds}`,
    'Content-Type': 'application/json',
    'Idempotence-Key': crypto.randomUUID(),
  }
}

export interface YooKassaPayment {
  id: string
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled'
  amount: { value: string; currency: string }
  confirmation?: { confirmation_url: string }
  metadata?: Record<string, string>
}

export async function createPayment(params: {
  amountKopecks: number
  description: string
  returnUrl: string
  metadata?: Record<string, string>
}): Promise<YooKassaPayment> {
  const res = await fetch(`${BASE_URL}/payments`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      amount: {
        value: (params.amountKopecks / 100).toFixed(2),
        currency: 'RUB',
      },
      capture: true,
      description: params.description,
      confirmation: {
        type: 'redirect',
        return_url: params.returnUrl,
      },
      metadata: params.metadata,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error((err as { description?: string }).description ?? 'YooKassa error')
  }

  return res.json() as Promise<YooKassaPayment>
}

export async function getPayment(paymentId: string): Promise<YooKassaPayment> {
  const res = await fetch(`${BASE_URL}/payments/${paymentId}`, {
    headers: authHeaders(),
  })

  if (!res.ok) throw new Error('Failed to fetch payment')
  return res.json() as Promise<YooKassaPayment>
}
