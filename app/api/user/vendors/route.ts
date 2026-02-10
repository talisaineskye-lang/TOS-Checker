import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET: Fetch user's watchlist
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: userVendors } = await supabase
    .from('user_vendors')
    .select('vendor_id, vendors(id, name, slug, logo_url, category, base_url)')
    .eq('user_id', user.id);

  return NextResponse.json({ vendors: userVendors || [] });
}

// POST: Add vendor to watchlist
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { vendor_id } = await request.json();

  const { error } = await supabase
    .from('user_vendors')
    .insert({ user_id: user.id, vendor_id });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

// DELETE: Remove vendor from watchlist
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { vendor_id } = await request.json();

  const { error } = await supabase
    .from('user_vendors')
    .delete()
    .eq('user_id', user.id)
    .eq('vendor_id', vendor_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
