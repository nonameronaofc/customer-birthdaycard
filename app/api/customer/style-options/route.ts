import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'Legacy customer style options sudah dinonaktifkan. Karakter sekarang diatur per tema.' },
    { status: 410 }
  );
}
