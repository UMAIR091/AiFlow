import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AutoFlow — AI-Powered Automation Platform',
  description: 'Describe any automation in plain English. Watch it build itself.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="bg-bg text-white min-h-screen">{children}</body>
    </html>
  )
}
