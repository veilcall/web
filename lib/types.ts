export interface RegisterResponse {
  session_token: string
  recovery_code: string
}

export interface LoginResponse {
  session_token: string
}

export interface PhoneNumber {
  id: string
  number: string
  country: string
  plan: '24H' | '7D' | '30D'
  expires_at: string
  status: 'active' | 'expired' | 'suspended'
}

export interface NumbersResponse {
  numbers: PhoneNumber[]
}

export interface ReserveNumberRequest {
  country: 'US' | 'GB'
  plan: '24H' | '7D' | '30D'
}

export interface ReserveNumberResponse {
  payment_id: string
  xmr_address: string
  amount_xmr: string
  expires_at: string
}

export type PaymentStatus = 'pending' | 'confirmed' | 'expired' | 'failed'

export interface PaymentStatusResponse {
  payment_id: string
  status: PaymentStatus
  xmr_address: string
  amount_xmr: string
  confirmations: number
  required_confirmations: number
  expires_at: string
  number?: PhoneNumber
}

export interface SMSMessage {
  id: string
  direction: 'inbound' | 'outbound'
  from: string
  to: string
  body: string
  received_at: string
  sent_at?: string
}

export interface SMSListResponse {
  messages: SMSMessage[]
}

export interface SendSMSRequest {
  from_number_id: string
  to: string
  body: string
}

export interface SendSMSResponse {
  message_id: string
  status: 'queued' | 'sent' | 'failed'
}

export interface WSNotification {
  type: 'sms_received' | 'payment_confirmed' | 'number_expiring'
  payload: WSNotificationPayload
}

export type WSNotificationPayload =
  | SMSReceivedPayload
  | PaymentConfirmedPayload
  | NumberExpiringPayload

export interface SMSReceivedPayload {
  number_id: string
  message: SMSMessage
}

export interface PaymentConfirmedPayload {
  payment_id: string
  number: PhoneNumber
}

export interface NumberExpiringPayload {
  number_id: string
  number: string
  expires_at: string
}

export interface ApiError {
  error: string
  message: string
}

export type Country = 'US' | 'GB'
export type Plan = '24H' | '7D' | '30D'

export const PLAN_PRICES: Record<Plan, string> = {
  '24H': '0.045',
  '7D': '0.18',
  '30D': '0.52',
}

export const PLAN_LABELS: Record<Plan, string> = {
  '24H': '24 HOURS',
  '7D': '7 DAYS',
  '30D': '30 DAYS',
}

export const COUNTRY_LABELS: Record<Country, string> = {
  US: 'UNITED STATES (+1)',
  GB: 'UNITED KINGDOM (+44)',
}
