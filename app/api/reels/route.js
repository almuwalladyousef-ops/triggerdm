import { NextResponse } from 'next/server'
import { getReels } from '@/lib/instagram'

export async function GET() {
  const reels = await getReels()
  return NextResponse.json(reels)
}
