import Script from 'next/script'

export function AnalyticsScript() {
  const measurementId = process.env.GA_MEASUREMENT_ID
  if (!measurementId) {
    return null
  }

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
