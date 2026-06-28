import { NextResponse } from 'next/server'
import { getAccountsWithStoredTokens } from '@/lib/accounts'

export const dynamic = 'force-dynamic'

export async function GET() {
  const accounts = (await getAccountsWithStoredTokens()).map(({ name, igId }) => ({ name, igId }))
  return NextResponse.json(accounts)
}
