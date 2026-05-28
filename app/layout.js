import '@/styles/globals.css'
import Link from 'next/link'

export const metadata = {
  title: 'TriggerDM',
  description: 'Instagram comment-to-DM automation',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="app">
          <aside className="sidebar">
            <div className="logo">TriggerDM</div>
            <nav>
              <Link href="/">Dashboard</Link>
              <Link href="/rules">Rules</Link>
            </nav>
          </aside>
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  )
}
