'use client'

export const ACTIVE_WORKSPACE_KEY = 'triggerdm.activeWorkspaceId'
export const WORKSPACES_CHANGED_EVENT = 'workspaceschange'

export function getStoredWorkspaceId() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(ACTIVE_WORKSPACE_KEY)
}

export function storeWorkspaceId(id) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, id)
  window.dispatchEvent(new CustomEvent('workspacechange', { detail: { id } }))
}

export function notifyWorkspacesChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(WORKSPACES_CHANGED_EVENT))
}

export function resolveActiveWorkspace(workspaces, storedId) {
  if (!workspaces?.length) return null
  return workspaces.find(w => w.id === storedId) || workspaces[0]
}

export default function WorkspaceSwitcher({ workspaces, activeWorkspaceId, onChange, variant = 'inline' }) {
  function select(id) {
    storeWorkspaceId(id)
    onChange?.(id)
  }

  if (variant === 'sidebar') {
    const activeWorkspace = resolveActiveWorkspace(workspaces, activeWorkspaceId)

    return (
      <div className="sidebar-workspace">
        <span className="sidebar-workspace__label">Workspace</span>
        <select
          className="sidebar-workspace__select"
          value={activeWorkspace?.id || ''}
          onChange={e => select(e.target.value)}
          aria-label="Workspace"
        >
          {workspaces.map(workspace => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
      </div>
    )
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
    </div>
  )
}
