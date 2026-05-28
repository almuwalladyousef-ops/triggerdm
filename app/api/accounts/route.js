import { NextResponse } from 'next/server'
import { getAccounts } from '@/lib/accounts'

export async function GET() {
  const accounts = getAccounts().map(({ name, igId }) => ({ name, igId }))
  return NextResponse.json(accounts)
}
