'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { buyNumber, getSessionToken } from '@/lib/api'
import type { Country, Plan } from '@/lib/types'
import { PLAN_LABELS, PLAN_PRICES, COUNTRY_LABELS } from '@/lib/types'

type Step = 1 | 2

export default function BuyNumberPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getSessionToken()
    if (!token) {
      router.push('/auth')
    }
  }, [router])

  const handleProceed = async () => {
    if (!selectedCountry || !selectedPlan) return
    setIsSubmitting(true)
    setError(null)
    try {
      const data = await buyNumber(selectedCountry, selectedPlan)
      router.push(`/payment/${data.payment_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reserve number')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="font-mono text-xs tracking-widest uppercase mb-2 pb-4 border-b border-black">
          BUY A NUMBER
        </h1>
      </div>

      {/* Step Indicator */}
      <div className="flex mb-12 border border-black">
        {[
          { num: 1, label: 'SELECT COUNTRY' },
          { num: 2, label: 'SELECT PLAN' },
        ].map((s, i) => (
          <div
            key={s.num}
            className={`flex-1 p-4 font-mono text-xs tracking-widest ${
              i === 0 ? 'border-r border-black' : ''
            } ${step === s.num ? 'bg-black text-white' : 'opacity-40'}`}
          >
            <span className="opacity-50 mr-2">{String(s.num).padStart(2, '0')}</span>
            {s.label}
          </div>
        ))}
      </div>

      {/* Step 1: Country Selection */}
      {step === 1 && (
        <div>
          <div className="font-mono text-xs tracking-widest uppercase mb-8 opacity-50">
            Choose a country for your virtual number
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-black mb-8">
            {(['US', 'GB'] as Country[]).map((country, i) => (
              <button
                key={country}
                onClick={() => setSelectedCountry(country)}
                className={`p-8 text-left transition-colors ${
                  i === 0 ? 'border-b md:border-b-0 md:border-r border-black' : ''
                } ${
                  selectedCountry === country
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-black hover:text-white'
                }`}
              >
                <div className="font-mono text-xs tracking-widest uppercase mb-3">
                  {country === 'US' ? 'UNITED STATES' : 'UNITED KINGDOM'}
                </div>
                <div className="font-mono text-2xl font-bold mb-4">
                  {country === 'US' ? '+1' : '+44'}
                </div>
                <div className="font-mono text-xs leading-relaxed opacity-70">
                  {COUNTRY_LABELS[country]}
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              if (selectedCountry) setStep(2)
            }}
            disabled={!selectedCountry}
            className="border border-black px-8 py-3 font-mono text-sm tracking-widest uppercase hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed w-full"
          >
            CONTINUE
          </button>
        </div>
      )}

      {/* Step 2: Plan Selection */}
      {step === 2 && (
        <div>
          <div className="font-mono text-xs tracking-widest uppercase mb-2 opacity-50">
            Selected country: {selectedCountry}
          </div>
          <button
            onClick={() => setStep(1)}
            className="font-mono text-xs underline mb-8 hover:opacity-70 transition-opacity"
          >
            Change country
          </button>

          <div className="font-mono text-xs tracking-widest uppercase mb-6 opacity-50">
            Choose a plan duration
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-black mb-8">
            {(Object.keys(PLAN_LABELS) as Plan[]).map((plan, i) => (
              <button
                key={plan}
                onClick={() => setSelectedPlan(plan)}
                className={`p-8 text-left transition-colors ${
                  i < 2 ? 'border-b md:border-b-0 md:border-r border-black' : ''
                } ${
                  selectedPlan === plan
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-black hover:text-white'
                }`}
              >
                <div className="font-mono text-xs tracking-widest uppercase mb-4 pb-4 border-b border-current">
                  {PLAN_LABELS[plan]}
                </div>
                <div className="font-mono text-xl font-bold mb-2">
                  ~ {PLAN_PRICES[plan]} XMR
                </div>
                <div className="font-mono text-xs opacity-60 mb-6">
                  per number
                </div>
                <ul className="font-mono text-xs space-y-1 opacity-70">
                  <li>— Inbound SMS</li>
                  <li>— Outbound SMS</li>
                  <li>— Inbound calls</li>
                  <li>— Outbound calls</li>
                </ul>
              </button>
            ))}
          </div>

          {error && (
            <div className="border border-black p-4 mb-6 font-mono text-xs">
              ERROR: {error}
            </div>
          )}

          <div className="border border-black p-4 mb-6 font-mono text-xs leading-relaxed">
            You will be asked to send an exact Monero amount to a generated address.
            Payment expires in 2 hours. The number is assigned upon 10 confirmations (~20 min).
          </div>

          <button
            onClick={handleProceed}
            disabled={!selectedPlan || isSubmitting}
            className="border border-black px-8 py-3 font-mono text-sm tracking-widest uppercase hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed w-full"
          >
            {isSubmitting
              ? 'RESERVING...'
              : `PROCEED TO PAYMENT${selectedPlan ? ` — ${PLAN_PRICES[selectedPlan]} XMR` : ''}`}
          </button>
        </div>
      )}
    </div>
  )
}
