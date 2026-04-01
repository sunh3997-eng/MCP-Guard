'use client'

// Redirect /tools to the dashboard (which already shows the tools table)
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ToolsPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/') }, [router])
  return null
}
