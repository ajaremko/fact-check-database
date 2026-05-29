import './global.css'
import { StyledComponentsRegistry } from './registry'

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
    <html lang="en">
      <body>
        <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
      </body>
    </html>
  )
}
