import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { VendorTemplate, CustomVendor } from '@/lib/types';

export const runtime = 'nodejs';

interface OnboardingPayload {
  vendors: VendorTemplate[];
  customVendors: CustomVendor[];
}

export async function POST(request: NextRequest) {
  try {
    const body: OnboardingPayload = await request.json();
    const { vendors, customVendors } = body;

    if (!vendors && !customVendors) {
      return NextResponse.json(
        { error: 'At least one vendor must be selected' },
        { status: 400 }
      );
    }

    const createdVendors: { id: string; name: string }[] = [];
    const errors: string[] = [];

    // Create catalog vendors
    for (const vendor of vendors || []) {
      // Insert vendor
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .insert({
          name: vendor.name,
          slug: vendor.slug,
          logo_url: vendor.logoUrl,
          category: vendor.category,
          base_url: vendor.baseUrl,
          is_custom: false,
          is_active: true,
        })
        .select()
        .single();

      if (vendorError) {
        errors.push(`Failed to create vendor ${vendor.name}: ${vendorError.message}`);
        continue;
      }

      // Insert documents for this vendor
      const documentsToInsert = vendor.documents.map((doc) => ({
        vendor_id: vendorData.id,
        doc_type: doc.type,
        url: doc.url,
        is_active: true,
      }));

      const { error: docsError } = await supabase
        .from('documents')
        .insert(documentsToInsert);

      if (docsError) {
        errors.push(`Failed to create documents for ${vendor.name}: ${docsError.message}`);
      } else {
        createdVendors.push({ id: vendorData.id, name: vendor.name });
      }
    }

    // Create custom vendors
    for (const custom of customVendors || []) {
      // Insert custom vendor
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .insert({
          name: custom.name,
          slug: custom.name.toLowerCase().replace(/\s+/g, '-'),
          logo_url: `https://logo.clearbit.com/${new URL(custom.baseUrl).hostname}`,
          category: null,
          base_url: custom.baseUrl,
          is_custom: true,
          is_active: true,
        })
        .select()
        .single();

      if (vendorError) {
        errors.push(`Failed to create custom vendor ${custom.name}: ${vendorError.message}`);
        continue;
      }

      // Insert documents for custom vendor
      const documentsToInsert = custom.documents.map((doc) => ({
        vendor_id: vendorData.id,
        doc_type: doc.type,
        url: doc.url,
        is_active: true,
      }));

      const { error: docsError } = await supabase
        .from('documents')
        .insert(documentsToInsert);

      if (docsError) {
        errors.push(`Failed to create documents for ${custom.name}: ${docsError.message}`);
      } else {
        createdVendors.push({ id: vendorData.id, name: custom.name });
      }
    }

    // Mark onboarding as complete
    const { error: settingsError } = await supabase
      .from('app_settings')
      .upsert({ key: 'onboarding_completed', value: 'true', updated_at: new Date().toISOString() });

    if (settingsError) {
      errors.push(`Failed to mark onboarding complete: ${settingsError.message}`);
    }

    return NextResponse.json({
      success: true,
      createdVendors,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Check onboarding status
export async function GET() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'onboarding_completed')
    .single();

  if (error) {
    // If table doesn't exist or no row, onboarding is not complete
    return NextResponse.json({ completed: false });
  }

  return NextResponse.json({ completed: data?.value === 'true' });
}
