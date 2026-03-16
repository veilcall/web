'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getPaymentStatus, getSessionToken } from '@/lib/api'
import type { PaymentStatusResponse, PaymentStatus } from '@/lib/types'

function AsciiProgressBar({
  current,
  total,
  width = 20,
}: {
  current: number
  total: number
  width?: number
}) {
  const filled = Math.min(Math.round((current / total) * width), width)
  const empty = width - filled
  return (
    <span className="font-mono text-sm">
      [{Array(filled).fill('=').join('')}
      {Array(empty).fill('-').join('')}]
    </span>
  )
}

function formatTimeRemaining(expiresAt: string): string {
  const now = new Date()
  const expires = new Date(expiresAt)
  const diffMs = expires.getTime() - now.getTime()

  if (diffMs <= 0) return 'EXPIRED'

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function PaymentPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { id } = params
  const [payment, setPayment] = useState<PaymentStatusResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState('')
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const token = getSessionToken()
    if (!token) {
      router.push('/auth')
    }
  }, [router])

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getPaymentStatus(id)
      setPayment(data)
      setError(null)

      if (data.status === 'confirmed' || data.status === 'expired' || data.status === 'failed') {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payment status')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchStatus()
    pollIntervalRef.current = setInterval(fetchStatus, 30000)

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [fetchStatus])

  // Countdown timer
  useEffect(() => {
    if (!payment?.expires_at) return

    const tick = () => {
      setTimeRemaining(formatTimeRemaining(payment.expires_at))
    }
    tick()
    timerIntervalRef.current = setInterval(tick, 1000)

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [payment?.expires_at])

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select text
    }
  }

  const getStatusLabel = (status: PaymentStatus): string => {
    switch (status) {
      case 'pending': return 'AWAITING PAYMENT'
      case 'confirmed': return 'CONFIRMED'
      case 'expired': return 'EXPIRED'
      case 'failed': return 'FAILED'
      default: return 'UNKNOWN'
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="font-mono text-xs tracking-widest uppercase mb-2 pb-4 border-b border-black">
          PAYMENT
        </h1>
      </div>

      {isLoading && (
        <div className="border border-black p-8 font-mono text-xs text-center">
          LOADING...
        </div>
      )}

      {error && !isLoading && (
        <div className="border border-black p-6 font-mono text-xs">
          ERROR: {error}
          <button
            onClick={fetchStatus}
            className="ml-4 border border-black px-3 py-1 hover:bg-black hover:text-white transition-colors"
          >
            RETRY
          </button>
        </div>
      )}

      {!isLoading && payment && (
        <>
          {/* Status Banner */}
          <div
            className={`border border-black p-4 mb-8 font-mono text-xs tracking-widest flex justify-between items-center ${
              payment.status === 'confirmed'
                ? 'bg-black text-white'
                : ''
            }`}
          >
            <span>STATUS: {getStatusLabel(payment.status)}</span>
            {payment.status === 'pending' && (
              <span className="opacity-50 text-xs">
                Auto-refresh every 30s
              </span>
            )}
          </div>

          {/* Confirmed State */}
          {payment.status === 'confirmed' && payment.number && (
            <div className="border border-black p-8 mb-8">
              <div className="font-mono text-xs tracking-widest uppercase mb-6 pb-4 border-b border-black">
                YOUR NUMBER HAS BEEN ASSIGNED
              </div>
              <div className="font-mono text-3xl font-bold mb-2">
                {payment.number.number}
              </div>
              <div className="font-mono text-xs opacity-50 mb-8">
                {payment.number.country} — {payment.number.plan}
              </div>
              <Link
                href="/dashboard"
                className="border border-black px-8 py-3 font-mono text-sm tracking-widest uppercase hover:bg-black hover:text-white transition-colors"
              >
                GO TO DASHBOARD
              </Link>
            </div>
          )}

          {/* Expired/Failed State */}
          {(payment.status === 'expired' || payment.status === 'failed') && (
            <div className="border border-black p-8 mb-8">
              <div className="font-mono text-xs tracking-widest uppercase mb-4 pb-4 border-b border-black">
                {payment.status === 'expired' ? 'PAYMENT EXPIRED' : 'PAYMENT FAILED'}
              </div>
              <p className="font-mono text-xs leading-relaxed mb-6">
                {payment.status === 'expired'
                  ? 'The payment window has closed. If you sent XMR, contact support with your payment ID. Otherwise, start a new order.'
                  : 'Payment processing failed. Please try again or contact support.'}
              </p>
              <Link
                href="/numbers/buy"
                className="border border-black px-6 py-3 font-mono text-xs tracking-widest uppercase hover:bg-black hover:text-white transition-colors"
              >
                START NEW ORDER
              </Link>
            </div>
          )}

          {/* Pending State — Payment Instructions */}
          {payment.status === 'pending' && (
            <>
              <div className="border border-black p-8 mb-6">
                <div className="font-mono text-xs tracking-widest uppercase mb-6 pb-4 border-b border-black">
                  PAYMENT INSTRUCTIONS
                </div>

                <div className="mb-6">
                  <div className="font-mono text-xs tracking-widest uppercase mb-2 opacity-50">
                    SEND EXACTLY
                  </div>
                  <div className="font-mono text-3xl font-bold">
                    {payment.amount_xmr} XMR
                  </div>
                </div>

                <div className="mb-6">
                  <div className="font-mono text-xs tracking-widest uppercase mb-2 opacity-50">
                    TO THIS ADDRESS
                  </div>
                  <div className="border border-black p-4 font-mono text-xs break-all leading-relaxed mb-2">
                    {payment.xmr_address}
                  </div>
                  <button
                    onClick={() => handleCopy(payment.xmr_address)}
                    className="border border-black px-4 py-2 font-mono text-xs tracking-widest uppercase hover:bg-black hover:text-white transition-colors"
                  >
                    {copied ? 'COPIED' : 'COPY ADDRESS'}
                  </button>
                </div>

                <div className="mb-6">
                  <div className="font-mono text-xs tracking-widest uppercase mb-3 opacity-50">
                    CONFIRMATION PROGRESS
                  </div>
                  <div className="flex items-center gap-4">
                    <AsciiProgressBar
                      current={payment.confirmations}
                      total={payment.required_confirmations}
                      width={20}
                    />
                    <span className="font-mono text-xs">
                      {payment.confirmations}/{payment.required_confirmations} CONFIRMATIONS
                    </span>
                  </div>
                </div>

                <div>
                  <div className="font-mono text-xs tracking-widest uppercase mb-2 opacity-50">
                    TIME REMAINING
                  </div>
                  <div className="font-mono text-xl">
                    {timeRemaining}
                  </div>
                </div>
              </div>

              {/* Warnings */}
              <div className="border border-black p-6 mb-6">
                <div className="font-mono text-xs tracking-widest uppercase mb-4 pb-3 border-b border-black">
                  IMPORTANT NOTICES
                </div>
                <ul className="font-mono text-xs space-y-2 leading-relaxed">
                  <li>— Payment expires in 2 hours. Do not wait.</li>
                  <li>— Minimum {payment.required_confirmations} confirmations required (~20 minutes).</li>
                  <li>— Send EXACTLY the amount shown. Under/overpayment may delay processing.</li>
                  <li>— Do not send from an exchange wallet — use your own Monero wallet.</li>
                  <li>— This address is single-use only. Do not reuse it.</li>
                </ul>
              </div>

              {/* Payment ID */}
              <div className="font-mono text-xs opacity-30">
                PAYMENT ID: {payment.payment_id}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
