import './global.css'
import { StyledComponentsRegistry } from './registry'
import { Navbar } from '@/components/Navbar'

export const metadata = {
  title: 'Fact-Check Research Dataset',
  description:
    'A continuously-updated, research-grade dataset aggregating fact-check records from 7+ international organizations. Encrypted at rest, normalized verdicts, daily ingestion.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <StyledComponentsRegistry>
      <html lang="en">
        <body>
          <Navbar />
          {children}
        </body>
      </html>
    </StyledComponentsRegistry>
  )
}
