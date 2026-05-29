import { getWebhookLog } from '@/lib/driveDB'

export async function GET(req) {
  const secret = req.headers.get('x-admin-secret')
  if (process.env.ADMIN_SECRET && secret !== process.env.ADMIN_SECRET) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const events = await getWebhookLog()
  return Response.json({ events })
}
