import { NextResponse } from 'next/server';
import { requireAuth } from '../../../lib/authMiddleware';

export async function GET(request) {
  const { user, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  return NextResponse.json({
    message: `Welcome to your dashboard, ${user.email}`,
  });
}