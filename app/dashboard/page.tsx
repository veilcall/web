'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getNumbers, releaseNumber, logout, getSessionToken, createWebSocket } from '@/lib/api'
import type { PhoneNumber, WSNotification } from '@/lib/types'

interface Toast {
  id: string
  message: string
  timestamp: number
}

function formatExpiry(expiresAt: string): string {
  const date = new Date(expiresAt)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()

  if (diffMs <= 0) return 'EXPIRED'

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) return `${diffDays}D ${diffHours % 24}H`
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  if (diffHours > 0) return `${diffHours}H ${diffMins}M`
  return `${diffMins}M`
}

export default function DashboardPage() {
  const router = useRouter()
  const [numbers, setNumbers] = useState<PhoneNumber[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string) => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, message, timestamp: Date.now() }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 8000)
  }, [])

  const fetchNumbers = useCallback(async () => {
    try {
      const data = await getNumbers()
      setNumbers(data.numbers || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load numbers')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const token = getSessionToken()
    if (!token) {
      router.push('/auth')
      return
    }
    fetchNumbers()
  }, [router, fetchNumbers])

  // WebSocket for live notifications
  useEffect(() => {
    const token = getSessionToken()
    if (!token) return

    const ws = createWebSocket('/ws/notify')
    if (!ws) return

    ws.onmessage = (event) => {
      try {
        const notification: WSNotification = JSON.parse(event.data)
        if (notification.type === 'sms_received') {
          const payload = notification.payload as { number_id: string; message: { from: string; body: string } }
          addToast(`INBOUND SMS from ${payload.message.from}: ${payload.message.body.slice(0, 60)}${payload.message.body.length > 60 ? '...' : ''}`)
        } else if (notification.type === 'payment_confirmed') {
          const payload = notification.payload as { number: { number: string } }
          addToast(`PAYMENT CONFIRMED — Number ${payload.number.number} is now active.`)
          fetchNumbers()
        } else if (notification.type === 'number_expiring') {
          const payload = notification.payload as { number: string; expires_at: string }
          addToast(`WARNING: Number ${payload.number} is expiring soon.`)
        }
      } catch {
        // ignore malformed messages
      }
    }

    ws.onerror = () => {
      // silent — WebSocket is best-effort
    }

    return () => {
      ws.close()
    }
  }, [addToast, fetchNumbers])

  const handleDelete = async (numberId: string, number: string) => {
    if (!confirm(`CONFIRM: Release number ${number}? This cannot be undone.`)) return
    setDeletingId(numberId)
    try {
      await releaseNumber(numberId)
      setNumbers((prev) => prev.filter((n) => n.id !== numberId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to release number')
    } finally {
      setDeletingId(null)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Live Notification Toasts */}
      {toasts.length > 0 && (
        <div className="fixed top-[57px] left-0 right-0 z-40">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="border-b border-black bg-black text-white px-6 py-3 font-mono text-xs"
            >
              <div className="max-w-4xl mx-auto flex justify-between items-start gap-4">
                <span>{toast.message}</span>
                <button
                  onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                  className="border border-white px-2 py-0.5 text-white hover:bg-white hover:text-black transition-colors shrink-0"
                >
                  DISMISS
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-12 pb-4 border-b border-black">
        <h1 className="font-mono text-xs tracking-widest uppercase">
          DASHBOARD
        </h1>
        <button
          onClick={handleLogout}
          className="border border-black px-4 py-2 font-mono text-xs tracking-widest uppercase hover:bg-black hover:text-white transition-colors"
        >
          LOGOUT
        </button>
      </div>

      {/* Your Numbers Section */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div className="font-mono text-xs tracking-widest uppercase">
            YOUR NUMBERS
          </div>
          <Link
            href="/numbers/buy"
            className="border border-black px-4 py-2 font-mono text-xs tracking-widest uppercase hover:bg-black hover:text-white transition-colors"
          >
            BUY NUMBER
          </Link>
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
              onClick={fetchNumbers}
              className="ml-4 border border-black px-3 py-1 hover:bg-black hover:text-white transition-colors"
            >
              RETRY
            </button>
          </div>
        )}

        {!isLoading && !error && numbers.length === 0 && (
          <div className="border border-black p-12 text-center">
            <div className="font-mono text-xs opacity-50 mb-6">
              No active numbers. Purchase a number to get started.
            </div>
            <Link
              href="/numbers/buy"
              className="border border-black px-6 py-3 font-mono text-xs tracking-widest uppercase hover:bg-black hover:text-white transition-colors"
            >
              BUY YOUR FIRST NUMBER
            </Link>
          </div>
        )}

        {!isLoading && !error && numbers.length > 0 && (
          <div className="border border-black overflow-x-auto">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_80px_60px_100px_180px] border-b border-black bg-black text-white">
              {['NUMBER', 'COUNTRY', 'PLAN', 'EXPIRES', 'ACTIONS'].map((col) => (
                <div
                  key={col}
                  className="font-mono text-xs tracking-widest uppercase px-4 py-3"
                >
                  {col}
                </div>
              ))}
            </div>

            {/* Table Rows */}
            {numbers.map((num, i) => (
              <div
                key={num.id}
                className={`grid grid-cols-[1fr_80px_60px_100px_180px] items-center ${
                  i < numbers.length - 1 ? 'border-b border-black' : ''
                }`}
              >
                <div className="font-mono text-sm px-4 py-4">{num.number}</div>
                <div className="font-mono text-xs px-4 py-4">{num.country}</div>
                <div className="font-mono text-xs px-4 py-4">{num.plan}</div>
                <div className="font-mono text-xs px-4 py-4">
                  {formatExpiry(num.expires_at)}
                </div>
                <div className="flex gap-2 px-4 py-3">
                  <Link
                    href={`/numbers/${num.id}/sms`}
                    className="border border-black px-2 py-1 font-mono text-xs hover:bg-black hover:text-white transition-colors"
                  >
                    SMS
                  </Link>
                  <Link
                    href={`/numbers/${num.id}/call`}
                    className="border border-black px-2 py-1 font-mono text-xs hover:bg-black hover:text-white transition-colors"
                  >
                    CALL
                  </Link>
                  <button
                    onClick={() => handleDelete(num.id, num.number)}
                    disabled={deletingId === num.id}
                    className="border border-black px-2 py-1 font-mono text-xs hover:bg-black hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {deletingId === num.id ? '...' : 'DELETE'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <hr className="border-t border-black mb-12" />

      {/* Quick Reference */}
      <section>
        <div className="font-mono text-xs tracking-widest uppercase mb-6">
          QUICK REFERENCE
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-black">
          <div className="p-6 border-b md:border-b-0 md:border-r border-black">
            <div className="font-mono text-xs tracking-widest uppercase mb-4 pb-3 border-b border-black">
              SENDING SMS
            </div>
            <ol className="font-mono text-xs space-y-2 list-none">
              <li>1. Click SMS next to any active number</li>
              <li>2. Enter destination in E.164 format (+12125551234)</li>
              <li>3. Type message and click SEND</li>
            </ol>
          </div>
          <div className="p-6">
            <div className="font-mono text-xs tracking-widest uppercase mb-4 pb-3 border-b border-black">
              MAKING CALLS
            </div>
            <ol className="font-mono text-xs space-y-2 list-none">
              <li>1. Click CALL next to any active number</li>
              <li>2. Enter destination in E.164 format (+12125551234)</li>
              <li>3. Allow microphone access and click CALL</li>
            </ol>
          </div>
        </div>
      </section>
    </div>
  )
}
