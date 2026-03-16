'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSMSMessages, sendSMS, getSessionToken, createWebSocket } from '@/lib/api'
import type { SMSMessage, WSNotification } from '@/lib/types'

function formatTime(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export default function SMSPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { id } = params

  const [messages, setMessages] = useState<SMSMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Send form
  const [toNumber, setToNumber] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendSuccess, setSendSuccess] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const token = getSessionToken()
    if (!token) {
      router.push('/auth')
    }
  }, [router])

  const fetchMessages = useCallback(async () => {
    try {
      const data = await getSMSMessages(id)
      // Reverse chronological order
      const sorted = [...(data.messages || [])].sort(
        (a, b) =>
          new Date(b.received_at || b.sent_at || '').getTime() -
          new Date(a.received_at || a.sent_at || '').getTime()
      )
      setMessages(sorted)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // WebSocket for real-time inbound SMS
  useEffect(() => {
    const token = getSessionToken()
    if (!token) return

    const ws = createWebSocket('/ws/notify')
    if (!ws) return
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const notification: WSNotification = JSON.parse(event.data)
        if (notification.type === 'sms_received') {
          const payload = notification.payload as { number_id: string; message: SMSMessage }
          if (payload.number_id === id) {
            setMessages((prev) => [payload.message, ...prev])
          }
        }
      } catch {
        // ignore malformed messages
      }
    }

    return () => {
      ws.close()
    }
  }, [id])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setSendError(null)
    setSendSuccess(false)

    if (!toNumber.trim()) {
      setSendError('Destination number is required')
      return
    }
    if (!toNumber.startsWith('+')) {
      setSendError('Number must be in E.164 format (e.g., +12125551234)')
      return
    }
    if (!messageBody.trim()) {
      setSendError('Message body is required')
      return
    }
    if (messageBody.length > 1600) {
      setSendError('Message exceeds 1600 characters')
      return
    }

    setIsSending(true)
    try {
      await sendSMS(id, toNumber.trim(), messageBody.trim())
      setSendSuccess(true)
      setMessageBody('')
      // Add optimistic outbound message
      const optimistic: SMSMessage = {
        id: `opt-${Date.now()}`,
        direction: 'outbound',
        from: id,
        to: toNumber.trim(),
        body: messageBody.trim(),
        received_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
      }
      setMessages((prev) => [optimistic, ...prev])
      setTimeout(() => setSendSuccess(false), 3000)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-start justify-between mb-12 pb-4 border-b border-black">
        <div>
          <div className="font-mono text-xs tracking-widest uppercase mb-1 opacity-50">
            SMS
          </div>
          <h1 className="font-mono text-sm tracking-widest uppercase">
            NUMBER ID: {id}
          </h1>
        </div>
        <Link
          href="/dashboard"
          className="border border-black px-4 py-2 font-mono text-xs tracking-widest uppercase hover:bg-black hover:text-white transition-colors"
        >
          BACK
        </Link>
      </div>

      {/* Send Form */}
      <section className="mb-12">
        <div className="font-mono text-xs tracking-widest uppercase mb-6 pb-3 border-b border-black">
          SEND MESSAGE
        </div>

        <form onSubmit={handleSend} className="border border-black p-6">
          <div className="mb-4">
            <label className="font-mono text-xs tracking-widest uppercase block mb-2">
              TO (E.164 FORMAT)
            </label>
            <input
              type="tel"
              value={toNumber}
              onChange={(e) => setToNumber(e.target.value)}
              placeholder="+12125551234"
              className="border border-black px-3 py-2 font-mono text-sm w-full bg-white focus:outline-none focus:ring-0"
              autoComplete="off"
            />
          </div>

          <div className="mb-4">
            <label className="font-mono text-xs tracking-widest uppercase block mb-2">
              MESSAGE
              <span className="ml-4 opacity-40 normal-case tracking-normal">
                {messageBody.length}/1600
              </span>
            </label>
            <textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              placeholder="Enter message text..."
              rows={4}
              className="border border-black px-3 py-2 font-mono text-sm w-full bg-white focus:outline-none focus:ring-0 resize-none"
            />
          </div>

          {sendError && (
            <div className="border border-black p-3 mb-4 font-mono text-xs">
              ERROR: {sendError}
            </div>
          )}

          {sendSuccess && (
            <div className="border border-black p-3 mb-4 font-mono text-xs bg-black text-white">
              MESSAGE SENT
            </div>
          )}

          <button
            type="submit"
            disabled={isSending}
            className="border border-black px-8 py-3 font-mono text-sm tracking-widest uppercase hover:bg-black hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed w-full"
          >
            {isSending ? 'SENDING...' : 'SEND'}
          </button>
        </form>
      </section>

      <hr className="border-t border-black mb-12" />

      {/* Message History */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="font-mono text-xs tracking-widest uppercase pb-3 border-b border-black flex-1">
            RECEIVED MESSAGES
          </div>
          <button
            onClick={fetchMessages}
            className="ml-4 border border-black px-3 py-1 font-mono text-xs hover:bg-black hover:text-white transition-colors"
          >
            REFRESH
          </button>
        </div>

        {isLoading && (
          <div className="border border-black p-8 font-mono text-xs text-center">
            LOADING...
          </div>
        )}

        {error && !isLoading && (
          <div className="border border-black p-4 font-mono text-xs">
            ERROR: {error}
          </div>
        )}

        {!isLoading && !error && messages.length === 0 && (
          <div className="border border-black p-8 font-mono text-xs text-center opacity-50">
            No messages yet. Inbound messages will appear here in real-time.
          </div>
        )}

        {!isLoading && messages.length > 0 && (
          <div className="space-y-0">
            {messages.map((msg, i) => (
              <div
                key={msg.id}
                className={`border border-black p-6 ${i > 0 ? '-mt-[1px]' : ''}`}
              >
                <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-black">
                  <div className="font-mono text-xs">
                    <span className="opacity-50">
                      {msg.direction === 'inbound' ? 'FROM' : 'TO'}
                    </span>{' '}
                    <span>
                      {msg.direction === 'inbound' ? msg.from : msg.to}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`font-mono text-xs border border-black px-2 py-0.5 ${
                        msg.direction === 'inbound'
                          ? ''
                          : 'bg-black text-white'
                      }`}
                    >
                      {msg.direction === 'inbound' ? 'INBOUND' : 'OUTBOUND'}
                    </span>
                    <span className="font-mono text-xs opacity-40">
                      {formatTime(msg.received_at || msg.sent_at || '')}
                    </span>
                  </div>
                </div>
                <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.body}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
