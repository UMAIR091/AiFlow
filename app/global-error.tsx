'use client'

/**
 * Catches crashes in the root layout itself. Renders without the app's CSS
 * pipeline, so everything here is inline-styled and dependency-free.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0f',
          color: '#fff',
          fontFamily: 'Inter, system-ui, sans-serif',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: '#8b8b9e', marginBottom: 28 }}>
            An unexpected error occurred. Try again, or head back to your dashboard.
          </p>
          <button
            onClick={reset}
            style={{
              background: 'transparent',
              color: '#fff',
              border: '1px solid #2a2a3a',
              borderRadius: 10,
              padding: '10px 18px',
              marginRight: 10,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Try again
          </button>
          <a
            href="/dashboard"
            style={{
              display: 'inline-block',
              background: '#7c6fff',
              color: '#fff',
              borderRadius: 10,
              padding: '10px 18px',
              textDecoration: 'none',
              fontSize: 14,
            }}
          >
            Go to Dashboard
          </a>
          {error.digest && (
            <p style={{ fontSize: 11, color: '#55556a', marginTop: 28 }}>
              Error reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
