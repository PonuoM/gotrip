import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import './globals.css'
import { getLang } from '@/lib/i18n.server'
import { LangProvider } from '@/components/LangProvider'
import { RouteProgress } from '@/components/RouteProgress'
import { DialogHost } from '@/components/DialogHost'
import { PwaRegister } from '@/components/PwaRegister'

export const metadata: Metadata = {
  title: 'GoTrip — Plan trips with your crew',
  description: 'Trip planning app for groups. Split costs. Make memories.',
  manifest: '/manifest.json',
  applicationName: 'GoTrip',
  appleWebApp: {
    capable: true,
    title: 'GoTrip',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32',   type: 'image/png' },
      { url: '/icon-192.png',   sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png',   sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#E63946',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolve lang from user profile (defaults to 'th' if not logged in)
  let lang: 'th' | 'en' = 'th'
  try {
    lang = await getLang()
  } catch {
    lang = 'th'
  }

  return (
    <html lang={lang}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;700;900&family=Inter:wght@400;500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">
        <LangProvider lang={lang}>
          <Suspense fallback={null}>
            <RouteProgress />
          </Suspense>
          {children}
          <DialogHost />
          <PwaRegister />
        </LangProvider>
      </body>
    </html>
  )
}
