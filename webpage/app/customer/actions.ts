'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requirePageRole } from '@/lib/supabase/role-guard'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const listingIdSchema = z.object({
  listingId: z.string().uuid(),
})

const inquirySchema = listingIdSchema.extend({
  message: z.string().trim().min(10).max(800),
})

const siteVisitSchema = listingIdSchema.extend({
  preferredDate: z.string().trim().min(1),
  notes: z.string().trim().max(600).optional().or(z.literal('')),
})

type ActionKind = 'success' | 'error'

function actionUrl(kind: ActionKind, code: string, section: string) {
  const params = new URLSearchParams({ [kind]: code })
  return `/customer/?${params.toString()}#${section}`
}

function isMarketplaceSchemaMissing(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    error.message?.toLowerCase().includes('could not find the table') ||
    error.message?.toLowerCase().includes('does not exist')
  )
}

async function getCustomerActionContext() {
  const { user } = await requirePageRole(['customer', 'admin'])
  const supabase = await createSupabaseServerClient()
  const { data: customer, error } = await supabase
    .from('customers')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (error) throw error
  return { supabase, user, customerId: customer?.id ?? null }
}

async function ensureActiveListing(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, listingId: string) {
  const { data, error } = await supabase
    .from('listings')
    .select('id,status')
    .eq('id', listingId)
    .eq('status', 'Active')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Listing is not available.')
}

export async function saveListing(formData: FormData) {
  const parsed = listingIdSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    redirect(actionUrl('error', 'invalid_listing', 'browse-listings'))
  }

  let failure: string | null = null

  try {
    const { supabase, user, customerId } = await getCustomerActionContext()
    await ensureActiveListing(supabase, parsed.data.listingId)

    const { data: existing, error: existingError } = await supabase
      .from('saved_listings')
      .select('id')
      .eq('buyer_profile_id', user.id)
      .eq('listing_id', parsed.data.listingId)
      .maybeSingle()

    if (existingError && !isMarketplaceSchemaMissing(existingError)) throw existingError
    if (existingError && isMarketplaceSchemaMissing(existingError)) {
      failure = 'marketplace_schema_pending'
    }

    if (!failure && !existing) {
      const { error } = await supabase.from('saved_listings').insert({
        buyer_profile_id: user.id,
        customer_id: customerId,
        listing_id: parsed.data.listingId,
      })

      if (error) throw error
    }
  } catch (error) {
    failure = isMarketplaceSchemaMissing(error as { code?: string; message?: string })
      ? 'marketplace_schema_pending'
      : 'save_failed'
    console.error('Customer save listing failed:', error)
  }

  if (failure) {
    redirect(actionUrl('error', failure, 'browse-listings'))
  }

  revalidatePath('/customer')
  redirect(actionUrl('success', 'listing_saved', 'saved-listings'))
}

export async function unsaveListing(formData: FormData) {
  const parsed = listingIdSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    redirect(actionUrl('error', 'invalid_listing', 'saved-listings'))
  }

  let failure: string | null = null

  try {
    const { supabase, user } = await getCustomerActionContext()
    const { error } = await supabase
      .from('saved_listings')
      .delete()
      .eq('buyer_profile_id', user.id)
      .eq('listing_id', parsed.data.listingId)

    if (error) throw error
  } catch (error) {
    failure = isMarketplaceSchemaMissing(error as { code?: string; message?: string })
      ? 'marketplace_schema_pending'
      : 'unsave_failed'
    console.error('Customer unsave listing failed:', error)
  }

  if (failure) {
    redirect(actionUrl('error', failure, 'saved-listings'))
  }

  revalidatePath('/customer')
  redirect(actionUrl('success', 'listing_unsaved', 'saved-listings'))
}

export async function createListingInquiry(formData: FormData) {
  const parsed = inquirySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    redirect(actionUrl('error', 'invalid_inquiry', 'browse-listings'))
  }

  let failure: string | null = null

  try {
    const { supabase, user, customerId } = await getCustomerActionContext()
    await ensureActiveListing(supabase, parsed.data.listingId)

    const { error } = await supabase.from('listing_inquiries').insert({
      buyer_profile_id: user.id,
      customer_id: customerId,
      listing_id: parsed.data.listingId,
      message: parsed.data.message,
      status: 'new',
    })

    if (error) throw error
  } catch (error) {
    failure = isMarketplaceSchemaMissing(error as { code?: string; message?: string })
      ? 'marketplace_schema_pending'
      : 'inquiry_failed'
    console.error('Customer inquiry creation failed:', error)
  }

  if (failure) {
    redirect(actionUrl('error', failure, 'browse-listings'))
  }

  revalidatePath('/customer')
  redirect(actionUrl('success', 'inquiry_created', 'inquiries'))
}

export async function createSiteVisitRequest(formData: FormData) {
  const parsed = siteVisitSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    redirect(actionUrl('error', 'invalid_site_visit', 'browse-listings'))
  }

  let failure: string | null = null

  try {
    const { supabase, user, customerId } = await getCustomerActionContext()
    await ensureActiveListing(supabase, parsed.data.listingId)

    const preferredDate = new Date(parsed.data.preferredDate)
    if (Number.isNaN(preferredDate.getTime())) {
      failure = 'invalid_site_visit'
    }

    if (!failure) {
      const { error } = await supabase.from('site_visit_requests').insert({
        buyer_profile_id: user.id,
        customer_id: customerId,
        listing_id: parsed.data.listingId,
        scheduled_for: preferredDate.toISOString(),
        preferred_window: parsed.data.preferredDate,
        notes: parsed.data.notes || null,
        status: 'requested',
      })

      if (error) throw error
    }
  } catch (error) {
    failure = isMarketplaceSchemaMissing(error as { code?: string; message?: string })
      ? 'marketplace_schema_pending'
      : 'site_visit_failed'
    console.error('Customer site visit request failed:', error)
  }

  if (failure) {
    redirect(actionUrl('error', failure, 'browse-listings'))
  }

  revalidatePath('/customer')
  redirect(actionUrl('success', 'site_visit_created', 'site-visits'))
}
