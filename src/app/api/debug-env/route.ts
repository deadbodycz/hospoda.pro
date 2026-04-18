import { NextResponse } from 'next/server'
export async function GET() {
  return NextResponse.json({
    ANTHROPIC: !!process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_prefix: process.env.ANTHROPIC_API_KEY?.slice(0, 10) ?? 'MISSING',
    GOOGLE: !!process.env.GOOGLE_VISION_API_KEY,
    STRIPE: !!process.env.STRIPE_SECRET_KEY,
    NODE_ENV: process.env.NODE_ENV,
  })
}
