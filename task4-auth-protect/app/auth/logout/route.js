import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';
import { requireAuth } from '../../../lib/authMiddleware';

export async function POST(request) {
  const { token, errorResponse } = await requireAuth(request);
  if (errorResponse) return errorResponse;

  const { error } = await supabase.auth.admin.signOut(token);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return new NextResponse(null, { status: 204 });
}