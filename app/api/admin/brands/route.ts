import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createServiceClient } from '@/lib/supabase';
import { isAdminAuthenticated } from '@/lib/admin';

export async function PATCH(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, name, logo_url } = await req.json();
  if (!id) {
    return NextResponse.json({ error: 'Missing brand id' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const updates: Record<string, string> = {};
  if (name !== undefined) updates.name = name;
  if (logo_url !== undefined) updates.logo_url = logo_url;

  const { error } = await supabase.from('brands').update(updates).eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
