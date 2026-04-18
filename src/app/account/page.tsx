'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LogOut, CreditCard, Mail, ArrowLeft } from 'lucide-react'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'

export default function AccountPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user, profile, isPro, loading, signInWithEmail, signOut, refreshProfile } = useSubscription()
  const [email, setEmail] = useState('')
  const [sendingLink, setSendingLink] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    if (searchParams.get('upgraded') === '1') {
      refreshProfile()
      toast('Vítej v PRO! Funkce jsou odemčeny.', 'success')
    }
  }, [searchParams, refreshProfile, toast])

  async function handleSendLink() {
    const trimmed = email.trim()
    if (!trimmed) return
    setSendingLink(true)

    // DEV MODE: bypass email rate limit — generate link directly
    if (process.env.NODE_ENV === 'development') {
      try {
        const res = await fetch('/api/auth/dev-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmed }),
        })
        const json = await res.json() as { url?: string; error?: string }
        if (json.url) {
          setSendingLink(false)
          window.location.href = json.url
          return
        }
      } catch {
        // fall through to normal flow
      }
    }

    const { error } = await signInWithEmail(trimmed)
    setSendingLink(false)
    if (error) {
      toast('Nepodařilo se odeslat odkaz. Zkus to znovu.', 'error')
    } else {
      toast('Odkaz odeslán! Zkontroluj email.', 'success')
    }
  }

  async function handlePortal() {
    setPortalLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token ?? ''}` },
      })
      const json = await res.json() as { url?: string; error?: string }
      if (json.url) {
        window.location.href = json.url
      } else {
        toast(json.error ?? 'Nepodařilo se otevřít správu předplatného.', 'error')
      }
    } catch {
      toast('Nepodařilo se připojit k platební bráně.', 'error')
    } finally {
      setPortalLoading(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center px-4 pt-16 pb-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-xl font-bold text-on-surface">Přihlásit se</h1>
            <p className="text-sm text-on-surface-variant">Pro PRO přístup zadej svůj email</p>
          </div>
          <div className="bg-surface-container rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 border border-outline-variant rounded-xl overflow-hidden">
              <Mail className="w-4 h-4 text-on-surface-variant ml-3 flex-shrink-0" />
              <input
                type="email"
                placeholder="tvuj@email.cz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendLink()}
                className="flex-1 bg-transparent py-3 pr-3 text-on-surface placeholder:text-on-surface-variant focus:outline-none text-sm"
              />
            </div>
            <button
              onClick={handleSendLink}
              disabled={sendingLink || !email.trim()}
              className="w-full bg-primary text-on-primary rounded-xl py-3 text-sm font-medium active:scale-95 transition-transform disabled:opacity-60"
            >
              {sendingLink ? 'Odesílám…' : 'Poslat přihlašovací odkaz'}
            </button>
          </div>
          <div className="text-center">
            <button
              onClick={() => router.push('/pricing')}
              className="text-primary text-sm underline underline-offset-2 active:opacity-70"
            >
              Zobrazit ceny
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center px-4 pt-16 pb-8">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-on-surface">Účet</h1>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 text-sm text-on-surface-variant active:opacity-70 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            Do aplikace
          </button>
        </div>

        <div className="bg-surface-container rounded-2xl p-5 space-y-2">
          <p className="text-xs text-on-surface-variant uppercase tracking-wider">Email</p>
          <p className="text-sm text-on-surface font-mono">{user.email}</p>
        </div>

        <div className="bg-surface-container rounded-2xl p-5 space-y-3">
          <p className="text-xs text-on-surface-variant uppercase tracking-wider">Předplatné</p>
          {isPro ? (
            <>
              <div className="flex items-center gap-2">
                <span className="bg-primary text-on-primary text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider">PRO</span>
                <span className="text-sm text-on-surface">
                  {profile?.subscription_tier === 'yearly' ? 'Roční' : 'Měsíční'}
                </span>
              </div>
              {profile?.subscription_ends_at && (
                <p className="text-xs text-on-surface-variant">
                  Obnovení: {new Date(profile.subscription_ends_at).toLocaleDateString('cs-CZ')}
                </p>
              )}
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                className="flex items-center gap-2 text-sm text-primary active:opacity-70 transition-opacity disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4" />
                {portalLoading ? 'Načítám…' : 'Spravovat předplatné'}
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-on-surface-variant">Nemáš aktivní předplatné.</p>
              <button
                onClick={() => router.push('/pricing')}
                className="w-full bg-primary text-on-primary rounded-xl py-3 text-sm font-medium active:scale-95 transition-transform"
              >
                Přejít na PRO
              </button>
            </div>
          )}
        </div>

        {isPro && (
          <button
            onClick={() => router.push('/')}
            className="w-full bg-primary text-on-primary rounded-xl py-3 text-sm font-medium active:scale-95 transition-transform accent-shadow"
          >
            Vybrat hospodu →
          </button>
        )}

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm text-on-surface-variant active:opacity-70 transition-opacity mx-auto"
        >
          <LogOut className="w-4 h-4" />
          Odhlásit se
        </button>
      </div>
    </div>
  )
}
