import { NextResponse } from 'next/server'
import { consumePendingMetaSelection, logWebhookEvent, saveStoredToken } from '@/lib/driveDB'
import { updateWorkspace } from '@/lib/workspaces'

export const dynamic = 'force-dynamic'

export async function POST(req) {
  const form = await req.formData()
  const pendingId = form.get('pendingId')?.toString()
  const pageId = form.get('pageId')?.toString()

  if (!pendingId || !pageId) {
    return new NextResponse('Missing account selection.', { status: 400 })
  }

  const pending = await consumePendingMetaSelection(pendingId)
  if (!pending) {
    return new NextResponse('This account selection expired. Restart Meta sign-in from Settings.', { status: 410 })
  }

  const page = (pending.pages || []).find(candidate => candidate.id === pageId)
  if (!page?.access_token || !page.instagram_business_account?.id) {
    return new NextResponse('Selected account was not available. Restart Meta sign-in from Settings.', { status: 400 })
  }

  await saveStoredToken(pending.tokenKey, page.access_token, {
    pageId: page.id,
    pageName: page.name,
    igId: page.instagram_business_account.id,
    igUsername: page.instagram_business_account.username,
    source: 'meta_oauth_selection',
  })

  await updateWorkspace(pending.workspaceId, {
    igId: page.instagram_business_account.id,
    pageId: page.id,
    igUsername: page.instagram_business_account.username,
    accountName: page.instagram_business_account.username
      ? `@${page.instagram_business_account.username}`
      : page.name,
  })

  await logWebhookEvent({
    type: 'meta_oauth_selected',
    tokenKey: pending.tokenKey,
    workspaceId: pending.workspaceId,
    pageId: page.id,
    pageName: page.name,
    igId: page.instagram_business_account.id,
    igUsername: page.instagram_business_account.username,
  }).catch(() => {})

  return NextResponse.redirect(new URL('/settings?connected=1', req.url), { status: 303 })
}
