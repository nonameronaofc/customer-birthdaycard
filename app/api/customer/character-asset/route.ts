import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'Legacy character assets sudah dinonaktifkan. Karakter sekarang memakai varian per tema.' },
    { status: 410 }
  );
}
