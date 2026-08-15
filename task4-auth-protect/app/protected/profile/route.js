import { NextResponse } from 'next/server';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader === 'Bearer ') {
    return NextResponse.json(
      { error: 'Access token required' },
      { status: 401 }
    );
  }

  // Token verification comes in Stage 3 — for now, just confirm the
  // header structure is being checked correctly.
  return NextResponse.json({ message: 'Token header received (not yet verified)' });
}