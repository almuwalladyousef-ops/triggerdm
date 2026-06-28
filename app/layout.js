import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import '@/styles/globals.css'
import BottomNav from '@/components/BottomNav'
import MobileWorkspaceBar from '@/components/MobileWorkspaceBar'
import Sidebar from '@/components/Sidebar'
import DesktopBackButton from '@/components/DesktopBackButton'

export const metadata = {
  title: 'TriggerDM',
  description: 'Instagram comment-to-DM automation',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <div className="app">
          <Sidebar />
          <main className="content">
            <MobileWorkspaceBar />
            {children}
          </main>
          <BottomNav />
          <DesktopBackButton />
        </div>
      </body>
    </html>
  )
}
