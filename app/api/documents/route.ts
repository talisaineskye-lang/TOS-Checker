import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth, requireAdmin } from '@/lib/api-auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get('vendor_id');
  const active = searchParams.get('active');

  let query = supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (vendorId) {
    query = query.eq('vendor_id', vendorId);
  }

  if (active === 'true') {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ documents: data ?? [] });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.authorized) return admin.response;

  const body = await request.json();

  if (!body?.vendor_id || !body?.doc_type || !body?.url) {
    return NextResponse.json(
      { error: 'vendor_id, doc_type, and url are required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('documents')
    .insert({
      vendor_id: body.vendor_id,
      doc_type: body.doc_type,
      url: body.url,
      is_active: body.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ document: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.authorized) return admin.response;

  const body = await request.json();

  if (!body?.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const allowedFields = ['vendor_id', 'doc_type', 'url', 'is_active'];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', body.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ document: data });
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.authorized) return admin.response;

  const { searchParams } = new URL(request.url);
  let id = searchParams.get('id');

  if (!id) {
    try {
      const body = await request.json();
      id = body?.id;
    } catch {
      id = null;
    }
  }

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const { error } = await supabase.from('documents').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
