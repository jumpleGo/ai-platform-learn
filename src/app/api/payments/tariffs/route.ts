import { NextResponse } from 'next/server';
import { TARIFFS } from '@/lib/payments/tariffs';

export async function GET() {
  return NextResponse.json({
    success: true,
    tariffs: TARIFFS,
  });
}
