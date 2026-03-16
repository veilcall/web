import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/Nav'

export const metadata: Metadata = {
  title: 'PRIVATECALL',
  description:
    'Anonymous virtual phone numbers. No identity required. Pay with Monero. Access via Tor.',
  keywords: ['anonymous', 'voip', 'sms', 'privacy', 'monero', 'virtual number'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-white text-black font-mono">
        <Nav />
        <main className="pt-[57px]">{children}</main>
      </body>
    </html>
  )
}
