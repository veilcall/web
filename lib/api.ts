import type {
  RegisterResponse,
  LoginResponse,
  NumbersResponse,
  ReserveNumberResponse,
  PaymentStatusResponse,
  SendSMSResponse,
  SMSListResponse,
  Country,
  Plan,
} from './types'

const API = 'https://api.dsmhs.kr'

function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('session_token')
}

function setSessionToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('session_token', token)
}

function clearSessionToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('session_token')
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getSessionToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['X-Session-Token'] = token
  }

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`
    try {
      const errorData = await response.json()
      errorMessage = errorData.message || errorData.error || errorMessage
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(errorMessage)
  }

  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return response.json() as Promise<T>
  }

  return {} as T
}

export async function register(): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>('/auth/register', {
    method: 'POST',
  })
}

export async function login(recoveryCode: string): Promise<void> {
  const data = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ recovery_code: recoveryCode }),
  })
  setSessionToken(data.session_token)
}

export async function logout(): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST' })
  } catch {
    // ignore logout errors
  } finally {
    clearSessionToken()
  }
}

export async function getNumbers(): Promise<NumbersResponse> {
  return apiFetch<NumbersResponse>('/numbers')
}

export async function buyNumber(
  country: Country,
  plan: Plan
): Promise<ReserveNumberResponse> {
  return apiFetch<ReserveNumberResponse>('/numbers/reserve', {
    method: 'POST',
    body: JSON.stringify({ country, plan }),
  })
}

export async function getPaymentStatus(id: string): Promise<PaymentStatusResponse> {
  return apiFetch<PaymentStatusResponse>(`/payment/${id}/status`)
}

export async function sendSMS(
  fromNumberId: string,
  to: string,
  text: string
): Promise<SendSMSResponse> {
  return apiFetch<SendSMSResponse>('/sms/send', {
    method: 'POST',
    body: JSON.stringify({
      from_number_id: fromNumberId,
      to,
      body: text,
    }),
  })
}

export async function getSMSMessages(numberId: string): Promise<SMSListResponse> {
  return apiFetch<SMSListResponse>(`/numbers/${numberId}/sms`)
}

export async function releaseNumber(numberId: string): Promise<void> {
  return apiFetch(`/numbers/${numberId}`, { method: 'DELETE' })
}

export function createWebSocket(path: string): WebSocket | null {
  if (typeof window === 'undefined') return null
  const token = getSessionToken()
  if (!token) return null

  const wsBase = API.replace('https://', 'wss://').replace('http://', 'ws://')
  const url = `${wsBase}${path}?token=${encodeURIComponent(token)}`

  try {
    return new WebSocket(url)
  } catch {
    return null
  }
}

export { getSessionToken, setSessionToken, clearSessionToken }
