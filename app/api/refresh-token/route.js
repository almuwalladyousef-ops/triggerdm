import { NextResponse } from 'next/server'
import { refreshToken } from '@/lib/tokenManager'

export async function POST(req) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await refreshToken()
  return NextResponse.json({ success: true, expiryDate: result.expiryDate })
}
