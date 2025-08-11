import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Make It Lo-Fi | Transform Any Audio Into Lo-Fi',
  description: 'Convert YouTube videos or upload audio files and transform them into nostalgic lo-fi vibes with our professional DSP processing.',
  keywords: 'lofi, audio converter, youtube to lofi, audio processing, music production',
  openGraph: {
    title: 'Make It Lo-Fi',
    description: 'Transform any audio into nostalgic lo-fi vibes',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}