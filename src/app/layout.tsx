import './globals.css'

export const metadata = { title: 'ThreadCounty', description: 'AI Fabric Analysis' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
