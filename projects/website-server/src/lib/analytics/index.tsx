import Script from 'next/script'

const measurementId = 'G-3M9TMFJZZD'

export function AnalyticsScript() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
          
        gtag('config', '${measurementId}');`}
      </Script>
    </>
  )
}
