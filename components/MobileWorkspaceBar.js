'use client'
import WorkspaceSwitcher from './WorkspaceSwitcher'
import useActiveWorkspace from './useActiveWorkspace'

export default function MobileWorkspaceBar() {
  const { workspaces, activeWorkspaceId, setActiveWorkspaceId, loadingWorkspaces } = useActiveWorkspace()

  if (loadingWorkspaces || !workspaces.length) return null

  return (
    <div className="mobile-workspace-bar">
      <WorkspaceSwitcher
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onChange={setActiveWorkspaceId}
        variant="sidebar"
      />
    </div>
  )
}
