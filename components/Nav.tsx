'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { logout, getSessionToken } from '@/lib/api'

export default function Nav() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const token = getSessionToken()
    setIsLoggedIn(!!token)
  }, [])

  const handleLogout = async () => {
    await logout()
    setIsLoggedIn(false)
    router.push('/')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-black">
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="font-mono text-sm font-bold tracking-widest uppercase hover:opacity-70 transition-opacity"
        >
          PRIVATECALL
        </Link>

        <div className="flex items-center gap-6">
          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="font-mono text-xs tracking-widest uppercase hover:opacity-70 transition-opacity"
              >
                DASHBOARD
              </Link>
              <button
                onClick={handleLogout}
                className="border border-black px-4 py-2 font-mono text-xs tracking-widest uppercase hover:bg-black hover:text-white transition-colors"
              >
                LOGOUT
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="border border-black px-4 py-2 font-mono text-xs tracking-widest uppercase hover:bg-black hover:text-white transition-colors"
            >
              LOGIN
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
