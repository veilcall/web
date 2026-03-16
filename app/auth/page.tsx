'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { register, login, setSessionToken } from '@/lib/api'

type Tab = 'REGISTER' | 'LOGIN'

export default function AuthPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('REGISTER')

  // Register state
  const [isRegistering, setIsRegistering] = useState(false)
  const [registerError, setRegisterError] = useState<string | null>(null)
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null)
  const [sessionTokenFromReg, setSessionTokenFromReg] = useState<string | null>(null)

  // Login state
  const [loginCode, setLoginCode] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  const handleRegister = async () => {
    setIsRegistering(true)
    setRegisterError(null)
    try {
      const data = await register()
      setRecoveryCode(data.recovery_code)
      setSessionTokenFromReg(data.session_token)
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsRegistering(false)
    }
  }

  const handleContinueToDashboard = () => {
    if (sessionTokenFromReg) {
      setSessionToken(sessionTokenFromReg)
    }
    router.push('/dashboard')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginCode.trim()) {
      setLoginError('Recovery code is required')
      return
    }
    setIsLoggingIn(true)
    setLoginError(null)
    try {
      await login(loginCode.trim())
      router.push('/dashboard')
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Page Header */}
      <div className="mb-12">
        <h1 className="font-mono text-xs tracking-widest uppercase mb-2 pb-4 border-b border-black">
          ACCOUNT ACCESS
        </h1>
      </div>

      {/* Tab Selector */}
      <div className="flex border-b border-black mb-12">
        {(['REGISTER', 'LOGIN'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab)
              setRegisterError(null)
              setLoginError(null)
              setRecoveryCode(null)
            }}
            className={`font-mono text-xs tracking-widest uppercase px-8 py-4 transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-black font-bold -mb-[2px]'
                : 'opacity-40 hover:opacity-70'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Register Panel */}
      {activeTab === 'REGISTER' && (
        <div className="max-w-lg">
          {!recoveryCode ? (
            <>
              <p className="font-mono text-sm leading-relaxed mb-8">
                No email. No name. No personal information. Click the button
                below to generate an anonymous account. You will receive a
                recovery code — the only way to access your account.
              </p>

              <div className="border border-black p-6 mb-8">
                <div className="font-mono text-xs tracking-widest uppercase mb-4 pb-4 border-b border-black">
                  WHAT YOU GET
                </div>
                <ul className="font-mono text-xs space-y-2">
                  <li>— A unique recovery code (your only credential)</li>
                  <li>— Immediate dashboard access</li>
                  <li>— Ability to purchase anonymous numbers</li>
                  <li>— No verification required</li>
                </ul>
              </div>

              {registerError && (
                <div className="border border-black p-4 mb-6 font-mono text-xs">
                  ERROR: {registerError}
                </div>
              )}

              <button
                onClick={handleRegister}
                disabled={isRegistering}
                className="border border-black px-8 py-3 font-mono text-sm tracking-widest uppercase hover:bg-black hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed w-full"
              >
                {isRegistering ? 'GENERATING...' : 'GENERATE ANONYMOUS ACCOUNT'}
              </button>
            </>
          ) : (
            <>
              <div className="border border-black p-6 mb-6">
                <div className="font-mono text-xs tracking-widest uppercase mb-4 pb-4 border-b border-black">
                  YOUR RECOVERY CODE
                </div>
                <div className="font-mono text-sm break-all leading-relaxed bg-white border border-black p-4 mb-4 select-all">
                  {recoveryCode}
                </div>
              </div>

              <div className="border border-black p-6 mb-8">
                <div className="font-mono text-xs tracking-widest uppercase mb-3 text-black">
                  SAVE THIS CODE — IT WILL NOT BE SHOWN AGAIN
                </div>
                <p className="font-mono text-xs leading-relaxed">
                  This is your only way to log back in. There is no password
                  reset. There is no account recovery. If you lose this code,
                  your account and any active numbers are permanently
                  inaccessible. Write it down or store it in a password manager
                  before continuing.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    if (typeof navigator !== 'undefined') {
                      navigator.clipboard.writeText(recoveryCode)
                    }
                  }}
                  className="border border-black px-4 py-2 font-mono text-xs tracking-widest uppercase hover:bg-black hover:text-white transition-colors"
                >
                  COPY CODE
                </button>
                <button
                  onClick={handleContinueToDashboard}
                  className="border border-black px-4 py-2 font-mono text-xs tracking-widest uppercase hover:bg-black hover:text-white transition-colors flex-1"
                >
                  CONTINUE TO DASHBOARD
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Login Panel */}
      {activeTab === 'LOGIN' && (
        <div className="max-w-lg">
          <p className="font-mono text-sm leading-relaxed mb-8">
            Enter your recovery code to access your account. Recovery codes
            are case-sensitive.
          </p>

          <form onSubmit={handleLogin}>
            <div className="mb-6">
              <label className="font-mono text-xs tracking-widest uppercase block mb-3">
                RECOVERY CODE
              </label>
              <input
                type="text"
                value={loginCode}
                onChange={(e) => setLoginCode(e.target.value)}
                placeholder="Enter your recovery code"
                className="border border-black px-3 py-2 font-mono text-sm w-full bg-white focus:outline-none focus:ring-0"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>

            {loginError && (
              <div className="border border-black p-4 mb-6 font-mono text-xs">
                ERROR: {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="border border-black px-8 py-3 font-mono text-sm tracking-widest uppercase hover:bg-black hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed w-full"
            >
              {isLoggingIn ? 'AUTHENTICATING...' : 'LOGIN'}
            </button>
          </form>

          <div className="mt-8 border border-black p-4">
            <p className="font-mono text-xs opacity-50 leading-relaxed">
              Do not have an account? Switch to the REGISTER tab to create
              one anonymously — no personal information required.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
