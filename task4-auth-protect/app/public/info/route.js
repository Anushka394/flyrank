import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

export async function GET() {
  return NextResponse.json({
    message: 'Welcome stranger! This info is public.',
    supabaseConnected: !!supabase,
  });
}