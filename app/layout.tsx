import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://kamal-mobile.vercel.app'),
  title: 'Kamal Store | Mobile, Headphones, Watches और Accessories | दुल्लापुर बाजार',
  description: 'दुल्लापुर बाजार में मोबाइल, headphones, headset, watches, chargers, speakers, accessories, mobile repair और digital services के लिए Kamal Store।',
  keywords: ['Kamal Store', 'दुल्लापुर बाजार mobile shop', 'mobile repair', 'headphones', 'headset', 'watch', 'mobile accessories', 'charger', 'speaker'],
  authors: [{ name: 'Kamal Store' }],
  creator: 'Kamal Store',
  publisher: 'Kamal Store',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'hi_IN',
    title: 'Kamal Store | Mobile और Accessories',
    description: 'Mobile, headphones, watches, accessories और repair services—दुल्लापुर बाजार।',
    siteName: 'Kamal Store',
  },
  twitter: { card: 'summary', title: 'Kamal Store | दुल्लापुर बाजार', description: 'Mobile, accessories और repair services के लिए Kamal Store।' },
  robots: { index: true, follow: true },
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="hi">
      <body className="antialiased">
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Store', name: 'Kamal Store', description: 'Mobile, headphones, watches, accessories और repair services.', telephone: '+91-9981176713', address: { '@type': 'PostalAddress', streetAddress: 'मेन रोड', addressLocality: 'दुल्लापुर बाजार', addressCountry: 'IN' }, areaServed: 'दुल्लापुर बाजार', priceRange: '₹₹' }) }} />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
