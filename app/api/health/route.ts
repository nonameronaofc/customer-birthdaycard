import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    ok: true,
    app: 'customer-birthdaycard',
    time: new Date().toISOString(),
  });
}
