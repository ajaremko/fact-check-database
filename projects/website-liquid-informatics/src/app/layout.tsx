import './global.css'

import { Navbar } from '@/lib/navigation'
import { AnalyticsScript } from '@/lib/analytics'
import { plusJakartaSans, redHatMono } from '@/lib/theme/font'
import { GlobalStyle } from '@/lib/theme/GlobalStyle'

import { StyledComponentsRegistry } from './registry'

export const metadata = {
  title: 'Liquid Informatics',
  description: 'Liquid Informatics — data management consultancy.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <StyledComponentsRegistry>
      <html
        lang="en"
        className={`${plusJakartaSans.variable} ${redHatMono.variable}`}
      >
        <body>
          <GlobalStyle />
          <AnalyticsScript />
          <Navbar />
          {children}
        </body>
      </html>
    </StyledComponentsRegistry>
  )
}
