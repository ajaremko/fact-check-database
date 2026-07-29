import type { Metadata } from 'next'

export const metadataBase: Metadata = {
  title: 'Liquid Informatics',
  description: 'Liquid Informatics — data management consultancy.',
  robots: 'index, follow',
  publisher: 'Liquid Informatics',
  authors: [{ name: 'Liquid Informatics' }],
  referrer: 'origin',
  icons: {
    icon: '/favicon-16x16.png',
    shortcut: '/favicon-32x32.png',
    apple: '/apple-touch-icon.png',
  },
  keywords: ['liquid informatics', 'data management', 'data consultancy'],
}
