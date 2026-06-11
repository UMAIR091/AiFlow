'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Page crashed:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-danger/10 border border-danger/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-danger" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-muted mb-8">
          An unexpected error occurred. Your data is safe — try again, or head back to your dashboard.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button variant="secondary" onClick={reset}>
            <RotateCcw className="w-4 h-4" />
            Try again
          </Button>
          <Link href="/dashboard">
            <Button>
              <LayoutDashboard className="w-4 h-4" />
              Go to Dashboard
            </Button>
          </Link>
        </div>
        {error.digest && (
          <p className="text-xs text-muted/50 mt-8">Error reference: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
