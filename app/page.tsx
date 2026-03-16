'use client'

import Link from 'next/link'
import { PLAN_PRICES, PLAN_LABELS } from '@/lib/types'

export default function HomePage() {
  return (
    <div className="bg-white text-black">
      {/* Hero Section */}
      <section className="min-h-[calc(100vh-57px)] flex flex-col justify-between px-6 py-16 max-w-4xl mx-auto">
        <div>
          <h1 className="font-mono text-5xl font-bold tracking-tighter uppercase leading-none mb-2">
            PRIVATECALL
          </h1>
          <div className="font-mono text-xs tracking-widest text-black opacity-50 uppercase mb-16">
            v1.0 — ANONYMOUS VOIP/SMS
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <p className="font-mono text-2xl leading-tight mb-4 max-w-xl">
            Anonymous virtual numbers.
            <br />
            No identity required.
          </p>
          <p className="font-mono text-sm mb-12 max-w-lg leading-relaxed">
            Get a real phone number for calls and SMS. Pay with Monero.
            No email, no name, no trace.
          </p>

          <div className="flex flex-wrap gap-4 mb-20">
            <Link
              href="/auth"
              className="border border-black px-8 py-3 font-mono text-sm tracking-widest uppercase hover:bg-black hover:text-white transition-colors"
            >
              GET STARTED
            </Link>
            <a
              href="#features"
              className="border border-black px-8 py-3 font-mono text-sm tracking-widest uppercase hover:bg-black hover:text-white transition-colors"
            >
              HOW IT WORKS
            </a>
          </div>

          {/* Feature Grid */}
          <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-black">
            <div className="border-b md:border-b-0 md:border-r border-black p-8">
              <div className="font-mono text-xs tracking-widest uppercase mb-4 pb-4 border-b border-black">
                ANONYMOUS
              </div>
              <p className="font-mono text-sm leading-relaxed">
                No registration. No email. No name. Generate a recovery code
                and your account exists.
              </p>
            </div>
            <div className="border-b md:border-b-0 md:border-r border-black p-8">
              <div className="font-mono text-xs tracking-widest uppercase mb-4 pb-4 border-b border-black">
                MONERO
              </div>
              <p className="font-mono text-sm leading-relaxed">
                Pay with XMR. No financial trail. No payment processors.
                No chargebacks. Pure privacy.
              </p>
            </div>
            <div className="p-8">
              <div className="font-mono text-xs tracking-widest uppercase mb-4 pb-4 border-b border-black">
                TOR
              </div>
              <p className="font-mono text-sm leading-relaxed">
                Access via .onion address. No IP exposure. End-to-end
                anonymity from browser to server.
              </p>
            </div>
          </div>
        </div>

        <div className="font-mono text-xs tracking-widest opacity-30 uppercase">
          SCROLL DOWN FOR PRICING
        </div>
      </section>

      <hr className="border-t border-black" />

      {/* How It Works */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="font-mono text-xs tracking-widest uppercase mb-10 pb-4 border-b border-black">
          HOW IT WORKS
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-black">
          {[
            {
              step: '01',
              title: 'REGISTER',
              desc: 'Click register. A recovery code is generated. Save it — it is your only login credential.',
            },
            {
              step: '02',
              title: 'SELECT NUMBER',
              desc: 'Choose a country (US or UK) and a duration plan. Review the Monero payment amount.',
            },
            {
              step: '03',
              title: 'PAY WITH XMR',
              desc: 'Send the exact XMR amount to the provided address. Wait 10 confirmations (~20 min).',
            },
            {
              step: '04',
              title: 'USE IT',
              desc: 'Your number is ready. Send and receive SMS. Make and receive calls. Fully anonymous.',
            },
          ].map((item, i) => (
            <div
              key={i}
              className={`p-8 ${i < 3 ? 'border-b md:border-b-0 md:border-r border-black' : ''}`}
            >
              <div className="font-mono text-xs tracking-widest opacity-30 mb-4">
                {item.step}
              </div>
              <div className="font-mono text-xs tracking-widest uppercase mb-4 pb-3 border-b border-black">
                {item.title}
              </div>
              <p className="font-mono text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <hr className="border-t border-black" />

      {/* Pricing */}
      <section id="pricing" className="max-w-4xl mx-auto px-6 py-20">
        <div className="font-mono text-xs tracking-widest uppercase mb-10 pb-4 border-b border-black">
          PRICING
        </div>
        <p className="font-mono text-xs mb-10 leading-relaxed max-w-lg">
          All prices in XMR (Monero). Rates are approximate and may vary slightly
          based on network conditions. Numbers are non-refundable once assigned.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-black">
          {(Object.keys(PLAN_LABELS) as Array<keyof typeof PLAN_LABELS>).map(
            (plan, i) => (
              <div
                key={plan}
                className={`p-8 ${i < 2 ? 'border-b md:border-b-0 md:border-r border-black' : ''}`}
              >
                <div className="font-mono text-xs tracking-widest uppercase mb-4 pb-4 border-b border-black">
                  {PLAN_LABELS[plan]}
                </div>
                <div className="font-mono text-2xl font-bold mb-2">
                  ~ {PLAN_PRICES[plan]} XMR
                </div>
                <div className="font-mono text-xs opacity-50 mb-6">
                  per number
                </div>
                <ul className="font-mono text-xs space-y-2 mb-8">
                  <li>— Inbound + outbound SMS</li>
                  <li>— Inbound + outbound calls</li>
                  <li>— US or UK number</li>
                  <li>— Real-time notifications</li>
                </ul>
                <Link
                  href="/auth"
                  className="border border-black px-4 py-2 font-mono text-xs tracking-widest uppercase hover:bg-black hover:text-white transition-colors w-full block text-center"
                >
                  GET STARTED
                </Link>
              </div>
            )
          )}
        </div>
      </section>

      <hr className="border-t border-black" />

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div>
            <div className="font-mono text-sm font-bold tracking-widest uppercase mb-2">
              PRIVATECALL
            </div>
            <div className="font-mono text-xs opacity-50">
              Anonymous virtual numbers. No identity required.
            </div>
          </div>
          <div className="font-mono text-xs space-y-2 opacity-50">
            <div>All communications encrypted in transit.</div>
            <div>No logs retained beyond 24 hours.</div>
            <div>Monero payments only.</div>
          </div>
        </div>
        <hr className="border-t border-black mt-8 mb-4" />
        <div className="font-mono text-xs opacity-30">
          PRIVATECALL — USE AT YOUR OWN RISK. FOR LEGAL PURPOSES ONLY.
        </div>
      </footer>
    </div>
  )
}
