'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import WorkspaceSwitcher from './WorkspaceSwitcher'
import useActiveWorkspace from './useActiveWorkspace'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/rules', label: 'Rules' },
  { href: '/settings', label: 'Settings' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { workspaces, activeWorkspaceId, setActiveWorkspaceId, loadingWorkspaces } = useActiveWorkspace()

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="logo">TriggerDM</div>
        {loadingWorkspaces ? (
          <div className="sidebar-workspace sidebar-workspace--loading">
            <span className="sidebar-workspace__label">Workspace</span>
            <span className="sidebar-workspace__placeholder">Loading...</span>
          </div>
        ) : (
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            onChange={setActiveWorkspaceId}
            variant="sidebar"
          />
        )}
        <nav>
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? 'active' : ''}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <Link href="/settings#workspaces" className="sidebar-manage-workspaces">
        Manage workspaces
      </Link>
    </aside>
  )
}
