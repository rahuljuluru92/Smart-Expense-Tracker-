import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ControlSpending - Smart Expense Tracker',
  description: 'Track your expenses with AI-powered insights, location-based alerts, and gamified savings goals.',
  keywords: ['expense tracker', 'budget', 'finance', 'AI', 'spending', 'savings'],
  authors: [{ name: 'ControlSpending Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: 'ControlSpending - Smart Expense Tracker',
    description: 'Track your expenses with AI-powered insights, location-based alerts, and gamified savings goals.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ControlSpending - Smart Expense Tracker',
    description: 'Track your expenses with AI-powered insights, location-based alerts, and gamified savings goals.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'hsl(var(--card))',
                color: 'hsl(var(--card-foreground))',
                border: '1px solid hsl(var(--border))',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
