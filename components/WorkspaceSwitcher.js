'use client'
import Link from 'next/link'

export const ACTIVE_WORKSPACE_KEY = 'triggerdm.activeWorkspaceId'

export function getStoredWorkspaceId() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(ACTIVE_WORKSPACE_KEY)
}

export function storeWorkspaceId(id) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, id)
  window.dispatchEvent(new CustomEvent('workspacechange', { detail: { id } }))
}

export function resolveActiveWorkspace(workspaces, storedId) {
  if (!workspaces?.length) return null
  return workspaces.find(w => w.id === storedId) || workspaces[0]
}

export default function WorkspaceSwitcher({ workspaces, activeWorkspaceId, onChange }) {
  function select(id) {
    storeWorkspaceId(id)
    onChange?.(id)
  }

  return (
    <div className="workspace-switcher">
      <div className="workspace-tabs" aria-label="Workspaces">
        {workspaces.map(workspace => (
          <button
            key={workspace.id}
            type="button"
            className={`workspace-tab ${activeWorkspaceId === workspace.id ? 'selected' : ''}`}
            onClick={() => select(workspace.id)}
            title={workspace.accountName || workspace.name}
          >
            {workspace.name}
          </button>
        ))}
      </div>
      <Link href="/settings#workspaces" className="workspace-manage-link">Manage</Link>
    </div>
  )
}
