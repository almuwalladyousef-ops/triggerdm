import '@/styles/globals.css'
import BottomNav from '@/components/BottomNav'
import MobileWorkspaceBar from '@/components/MobileWorkspaceBar'
import Sidebar from '@/components/Sidebar'

export const metadata = {
  title: 'TriggerDM',
  description: 'Instagram comment-to-DM automation',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="app">
          <Sidebar />
          <main className="content">
            <MobileWorkspaceBar />
            {children}
          </main>
          <BottomNav />
        </div>
      </body>
    </html>
  )
}
