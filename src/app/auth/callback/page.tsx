'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          router.replace('/account?error=1')
        } else {
          router.replace('/')
        }
      })
    } else {
      router.replace('/')
    }
  }, [router, searchParams])

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background">
      <p className="text-on-surface-variant text-sm">Přihlašování…</p>
    </div>
  )
}
