'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export function LoginErrorHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const error = searchParams.get('error')
    if (error === 'no_profile') {
      toast.error('Akun Anda belum terdaftar dalam sistem. Silakan hubungi administrator.')
      // Clear the error parameter from URL
      router.replace('/login', { scroll: false })
      // Sign out the user since they don't have a profile
      const supabase = createClient()
      supabase.auth.signOut()
    } else if (error === 'no_session') {
      toast.error('Sesi telah berakhir. Silakan login kembali.')
      router.replace('/login', { scroll: false })
    }
  }, [searchParams, router])

  return null
}
