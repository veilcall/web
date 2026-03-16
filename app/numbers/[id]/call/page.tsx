'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSessionToken } from '@/lib/api'

type CallStatus = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'ENDED' | 'ERROR'

const API = 'https://api.dsmhs.kr'

export default function CallPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { id } = params

  const [dialNumber, setDialNumber] = useState('')
  const [status, setStatus] = useState<CallStatus>('IDLE')
  const [statusMessage, setStatusMessage] = useState('')
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const callTimerRef = useRef<NodeJS.Timeout | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const token = getSessionToken()
    if (!token) {
      router.push('/auth')
    }
  }, [router])

  // Format call duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const cleanup = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current)
      callTimerRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  const handleCall = async () => {
    if (!dialNumber.trim()) {
      setStatusMessage('Enter a destination number')
      return
    }
    if (!dialNumber.startsWith('+')) {
      setStatusMessage('Number must be in E.164 format (e.g., +12125551234)')
      return
    }

    setStatus('CONNECTING')
    setStatusMessage('Requesting microphone access...')
    setCallDuration(0)

    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = stream

      setStatusMessage('Establishing WebRTC connection...')

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      })
      peerConnectionRef.current = pc

      // Add local tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))

      // Handle remote audio
      const remoteStream = new MediaStream()
      const audioEl = new Audio()
      audioEl.srcObject = remoteStream
      audioEl.autoplay = true

      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStream.addTrack(track)
        })
      }

      // Connect to signaling server via WebSocket
      const token = getSessionToken()
      const wsBase = API.replace('https://', 'wss://').replace('http://', 'ws://')
      const ws = new WebSocket(
        `${wsBase}/ws/call?token=${encodeURIComponent(token || '')}&number_id=${encodeURIComponent(id)}`
      )
      wsRef.current = ws

      ws.onopen = async () => {
        setStatusMessage('Signaling connected. Creating offer...')

        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        ws.send(
          JSON.stringify({
            type: 'call_initiate',
            to: dialNumber.trim(),
            number_id: id,
            sdp: offer.sdp,
          })
        )
      }

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data)

          if (msg.type === 'answer') {
            await pc.setRemoteDescription(
              new RTCSessionDescription({ type: 'answer', sdp: msg.sdp })
            )
          } else if (msg.type === 'ice_candidate' && msg.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(msg.candidate))
          } else if (msg.type === 'call_connected') {
            setStatus('CONNECTED')
            setStatusMessage('Call connected')
            callTimerRef.current = setInterval(() => {
              setCallDuration((prev) => prev + 1)
            }, 1000)
          } else if (msg.type === 'call_ended') {
            setStatus('ENDED')
            setStatusMessage('Call ended by remote party')
            cleanup()
          } else if (msg.type === 'call_failed') {
            setStatus('ERROR')
            setStatusMessage(msg.reason || 'Call failed')
            cleanup()
          }
        } catch {
          // ignore malformed messages
        }
      }

      ws.onerror = () => {
        setStatus('ERROR')
        setStatusMessage('Signaling connection failed')
        cleanup()
      }

      ws.onclose = () => {
        if (status === 'CONNECTED' || status === 'CONNECTING') {
          setStatus('ENDED')
          setStatusMessage('Connection closed')
          cleanup()
        }
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'ice_candidate',
              candidate: event.candidate,
            })
          )
        }
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setStatus('ENDED')
          setStatusMessage('Connection lost')
          cleanup()
        }
      }
    } catch (err) {
      setStatus('ERROR')
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setStatusMessage('Microphone access denied. Allow microphone access and try again.')
      } else if (err instanceof Error && err.name === 'NotFoundError') {
        setStatusMessage('No microphone found. Connect a microphone and try again.')
      } else {
        setStatusMessage(err instanceof Error ? err.message : 'Call setup failed')
      }
      cleanup()
    }
  }

  const handleHangUp = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'call_end' }))
    }
    setStatus('ENDED')
    setStatusMessage('You ended the call')
    cleanup()
  }

  const handleMuteToggle = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted
      })
      setIsMuted(!isMuted)
    }
  }

  const handleReset = () => {
    setStatus('IDLE')
    setStatusMessage('')
    setCallDuration(0)
    setIsMuted(false)
  }

  const isActive = status === 'CONNECTING' || status === 'CONNECTED'

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-start justify-between mb-12 pb-4 border-b border-black">
        <div>
          <div className="font-mono text-xs tracking-widest uppercase mb-1 opacity-50">
            VOICE CALL
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

      {/* Notice */}
      <div className="border border-black p-4 mb-8">
        <div className="font-mono text-xs leading-relaxed">
          Calls routed via FreeSWITCH Verto. WebRTC required. Ensure microphone
          access is permitted in your browser settings.
        </div>
      </div>

      {/* Dial Input */}
      <div className="mb-8">
        <label className="font-mono text-xs tracking-widest uppercase block mb-3">
          DESTINATION NUMBER (E.164 FORMAT)
        </label>
        <input
          type="tel"
          value={dialNumber}
          onChange={(e) => setDialNumber(e.target.value)}
          placeholder="+12125551234"
          disabled={isActive}
          className="border border-black px-3 py-2 font-mono text-sm w-full bg-white focus:outline-none focus:ring-0 disabled:opacity-40 disabled:cursor-not-allowed"
          autoComplete="off"
        />
      </div>

      {/* Status Display */}
      <div className="border border-black p-6 mb-6">
        <div className="font-mono text-xs tracking-widest uppercase mb-4 pb-3 border-b border-black">
          STATUS
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div
              className={`font-mono text-xl font-bold mb-2 ${
                status === 'CONNECTED' ? '' : 'opacity-60'
              }`}
            >
              {status}
            </div>
            {statusMessage && (
              <div className="font-mono text-xs opacity-50">{statusMessage}</div>
            )}
          </div>

          {status === 'CONNECTED' && (
            <div className="font-mono text-2xl font-bold">
              {formatDuration(callDuration)}
            </div>
          )}
        </div>

        {/* Mute indicator */}
        {status === 'CONNECTED' && isMuted && (
          <div className="mt-4 border border-black px-3 py-1 font-mono text-xs inline-block">
            MICROPHONE MUTED
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-3">
        {/* Main Call / Hang Up Button */}
        {status === 'IDLE' && (
          <button
            onClick={handleCall}
            className="border border-black px-8 py-4 font-mono text-sm tracking-widest uppercase hover:bg-black hover:text-white transition-colors w-full"
          >
            CALL
          </button>
        )}

        {isActive && (
          <>
            <button
              onClick={handleHangUp}
              className="border border-black px-8 py-4 font-mono text-sm tracking-widest uppercase bg-black text-white hover:bg-white hover:text-black transition-colors w-full"
            >
              HANG UP
            </button>
            {status === 'CONNECTED' && (
              <button
                onClick={handleMuteToggle}
                className="border border-black px-8 py-3 font-mono text-xs tracking-widest uppercase hover:bg-black hover:text-white transition-colors w-full"
              >
                {isMuted ? 'UNMUTE' : 'MUTE'}
              </button>
            )}
          </>
        )}

        {(status === 'ENDED' || status === 'ERROR') && (
          <button
            onClick={handleReset}
            className="border border-black px-8 py-3 font-mono text-sm tracking-widest uppercase hover:bg-black hover:text-white transition-colors w-full"
          >
            NEW CALL
          </button>
        )}
      </div>

      {/* Technical Notes */}
      <div className="mt-12 border border-black p-6">
        <div className="font-mono text-xs tracking-widest uppercase mb-4 pb-3 border-b border-black">
          TECHNICAL NOTES
        </div>
        <ul className="font-mono text-xs space-y-2 leading-relaxed opacity-60">
          <li>— All calls are end-to-end encrypted via DTLS-SRTP.</li>
          <li>— Your IP is hidden from the call recipient.</li>
          <li>— Outbound caller ID shows your virtual number.</li>
          <li>— Call records are not retained beyond 24 hours.</li>
          <li>— Browser must support WebRTC (all modern browsers).</li>
        </ul>
      </div>
    </div>
  )
}
