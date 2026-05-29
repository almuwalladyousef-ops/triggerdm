import { NextResponse } from 'next/server'
import { getAccountsWithStoredTokens } from '@/lib/accounts'

export async function GET() {
  const accounts = (await getAccountsWithStoredTokens()).map(({ name, igId }) => ({ name, igId }))
  return NextResponse.json(accounts)
}
