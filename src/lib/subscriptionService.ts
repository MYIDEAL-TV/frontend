import { supabase } from "@/integrations/supabase/client";
import { getLocationConfig } from "@/config/locationConfig";

export interface SubscriberData {
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string;
  landlinePhone?: string;
  companyName?: string;
  accommodationName?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  acceptsMarketing: boolean;
}

export interface ManagerData {
  firstName?: string;
  lastName?: string;
  email?: string;
  cellPhone?: string;
  companyName?: string;
  address?: string;
  city?: string;
  postalCode?: string;
}

export interface FinancialManagerData {
  firstName?: string;
  lastName?: string;
  email?: string;
  cellPhone?: string;
  landlinePhone?: string;
}

export interface DeliveryData {
  address?: string;
  city?: string;
  postalCode?: string;
  cellPhone?: string;
}

export interface AddonData {
  id: string;
  name: string;
  price: number;
  quantity?: number;
}

export interface CreateSubscriptionData {
  subscriber: SubscriberData;
  location: string;
  planId: string;
  planPrice: number;
  currency: string;
  addons: AddonData[];
  additionalScreens: number;
  durationMonths: number;
  staffUserId: string;
  staffEmail: string;
  manager?: ManagerData;
  financialManager?: FinancialManagerData;
  delivery?: DeliveryData;
  contractType: 'in_person' | 'remote';
  decoderRental: boolean;
  customItemName?: string;
  customItemPrice?: number;
}

/**
 * Calculate screen price based on location
 */
function calculateScreenPrice(location: string, screensCount: number): number {
  const locationConfig = getLocationConfig(location);
  if (!locationConfig) return 0;

  const pricePerScreen = location === 'saint-barthelemy' ? 20 : 
    locationConfig.currency === 'EUR' ? 10 : 20;
  
  return screensCount * pricePerScreen;
}

/**
 * Calculate end date based on start date and duration in months
 */
function calculateEndDate(startDate: Date, durationMonths: number): Date {
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + durationMonths);
  endDate.setDate(endDate.getDate() - 1); // End date is inclusive
  return endDate;
}

/**
 * Calculate decoder rental cost based on location and quantity
 */
function calculateDecoderRentalCost(
  location: string,
  decoderRental: boolean,
  totalDecoders: number
): number {
  if (!decoderRental) return 0;
  
  const locationConfig = getLocationConfig(location);
  if (!locationConfig) return 0;

  return totalDecoders * locationConfig.decoderRentalPrice;
}

/**
 * Create a new subscription with initial version
 */
export async function createInitialSubscription(data: CreateSubscriptionData): Promise<{ subscriptionId: string; error?: string }> {
  try {
    // 1. Check if subscriber already exists by email
    const { data: existingSubscriber } = await supabase
      .from('subscribers')
      .select('id')
      .eq('email', data.subscriber.email)
      .maybeSingle();

    let subscriberId: string;

    if (existingSubscriber) {
      // Use existing subscriber
      subscriberId = existingSubscriber.id;
    } else {
      // Create new subscriber
      const { data: subscriber, error: subscriberError } = await supabase
        .from('subscribers')
        .insert({
          first_name: data.subscriber.firstName,
          last_name: data.subscriber.lastName,
          email: data.subscriber.email,
          cell_phone: data.subscriber.cellPhone,
          landline_phone: data.subscriber.landlinePhone,
          company_name: data.subscriber.companyName,
          accommodation_name: data.subscriber.accommodationName,
          address: data.subscriber.address,
          city: data.subscriber.city,
          postal_code: data.subscriber.postalCode,
          country: data.subscriber.country,
          accepts_marketing: data.subscriber.acceptsMarketing,
          created_by_email: data.staffEmail,
        })
        .select()
        .single();

      if (subscriberError) throw subscriberError;
      subscriberId = subscriber.id;
    }

    // 2. Check if a subscription already exists for this subscriber, location, and accommodation
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('subscriber_id', subscriberId)
      .eq('location', data.location as any)
      .eq('accommodation_name', data.subscriber.accommodationName || 'Default Accommodation')
      .maybeSingle();

    if (existingSubscription) {
      return { 
        subscriptionId: '', 
        error: 'A subscription already exists for this subscriber at this location and accommodation. Please use the existing subscription or choose a different accommodation.' 
      };
    }

    // 3. Insert subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert([{
        subscriber_id: subscriberId,
        location: data.location as any,
        accommodation_name: data.subscriber.accommodationName || 'Default Accommodation',
        created_by_email: data.staffEmail,
      }])
      .select()
      .single();

    if (subscriptionError) throw subscriptionError;

    // 4. Calculate prices
    const addonsPrice = data.addons.reduce((sum, addon) => sum + (addon.price * (addon.quantity || 1)), 0);
    const screensPrice = calculateScreenPrice(data.location, data.additionalScreens);
    const totalDecoders = 1 + data.additionalScreens;
    const decoderRentalCost = calculateDecoderRentalCost(data.location, data.decoderRental, totalDecoders);
    const totalPrice = data.planPrice + addonsPrice + screensPrice + decoderRentalCost;

    // 5. Calculate dates
    const startDate = new Date();
    const endDate = calculateEndDate(startDate, data.durationMonths);

    // 6. Insert subscription version
    const { data: version, error: versionError } = await supabase
      .from('subscription_versions')
      .insert({
        subscription_id: subscription.id,
        version_number: 1,
        plan_id: data.planId,
        additional_screens: data.additionalScreens,
        monthly_base_price: data.planPrice,
        monthly_addons_price: addonsPrice,
        monthly_screens_price: screensPrice,
        monthly_total_price: totalPrice,
        currency: data.currency,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        duration_months: data.durationMonths,
        is_contract_reset: true,
        status: 'active',
        change_reason: 'Initial subscription',
        created_by_email: data.staffEmail,
        custom_item_name: data.customItemName || null,
        custom_item_price: data.customItemPrice || 0,
      })
      .select()
      .single();

    if (versionError) throw versionError;

    // 7. Insert version addons
    if (data.addons.length > 0) {
      const { error: addonsError } = await supabase
        .from('subscription_version_addons')
        .insert(
          data.addons.map((addon) => ({
            version_id: version.id,
            addon_id: addon.id,
            addon_name: addon.name,
            monthly_price: addon.price,
            quantity: addon.quantity || 1,
          }))
        );

      if (addonsError) throw addonsError;
    }

    // 8. Insert or update optional manager
    if (data.manager && (data.manager.firstName || data.manager.email)) {
      const { error: managerError } = await supabase.from('managers').insert({
        subscription_id: subscription.id,
        first_name: data.manager.firstName,
        last_name: data.manager.lastName,
        email: data.manager.email,
        cell_phone: data.manager.cellPhone,
        company_name: data.manager.companyName,
        address: data.manager.address,
        city: data.manager.city,
        postal_code: data.manager.postalCode,
      });

      if (managerError) throw managerError;
    }

    // 9. Insert optional financial manager
    if (data.financialManager && (data.financialManager.firstName || data.financialManager.email)) {
      const { error: fmError } = await supabase.from('financial_managers').insert({
        subscription_id: subscription.id,
        first_name: data.financialManager.firstName,
        last_name: data.financialManager.lastName,
        email: data.financialManager.email,
        cell_phone: data.financialManager.cellPhone,
        landline_phone: data.financialManager.landlinePhone,
      });

      if (fmError) throw fmError;
    }

    // 10. Insert optional delivery address
    if (data.delivery && data.delivery.address) {
      const { error: deliveryError } = await supabase.from('delivery_addresses').insert({
        subscription_id: subscription.id,
        address: data.delivery.address,
        city: data.delivery.city,
        postal_code: data.delivery.postalCode,
        cell_phone: data.delivery.cellPhone,
      });

      if (deliveryError) throw deliveryError;
    }

    // 11. Insert contract record with staff user tracking and submission timestamp
    // Map contractType to the correct enum value: 'individual' or 'professional' becomes 'in_person' or 'remote'
    const contractTypeEnum = data.contractType === 'remote' ? 'remote' : 'in_person';
    
    const { error: contractError } = await supabase.from('contracts').insert({
      subscription_id: subscription.id,
      contract_type: contractTypeEnum,
      status: 'pending',
      staff_user_id: data.staffUserId,
      submitted_at: new Date().toISOString(), // Track when contract was created
    });

    if (contractError) throw contractError;

    return { subscriptionId: subscription.id };
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return { subscriptionId: '', error: error.message };
  }
}

/**
 * Get subscription with all details
 */
export async function getSubscriptionWithDetails(subscriptionId: string) {
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select(`
      *,
      subscriber:subscribers(*),
      current_version:subscription_versions!current_version_id(*),
      manager:managers(*),
      financial_manager:financial_managers(*),
      delivery_address:delivery_addresses(*),
      contract:contracts(*)
    `)
    .eq('id', subscriptionId)
    .single();

  if (subError) throw subError;

  // Get addons for current version
  if (subscription.current_version) {
    const { data: addons } = await supabase
      .from('subscription_version_addons')
      .select('*')
      .eq('version_id', subscription.current_version.id);

    (subscription.current_version as any).addons = addons || [];
  }

  return subscription;
}

/**
 * Get version timeline for a subscription
 */
export async function getVersionTimeline(subscriptionId: string) {
  const { data: versions, error } = await supabase
    .from('subscription_versions')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .order('version_number', { ascending: false });

  if (error) throw error;

  // Get addons for each version
  for (const version of versions) {
    const { data: addons } = await supabase
      .from('subscription_version_addons')
      .select('*')
      .eq('version_id', version.id);

    (version as any).addons = addons || [];
  }

  return versions;
}

/**
 * Record contract submission (when contract is sent to customer)
 */
export async function recordContractSubmission(
  subscriptionId: string,
  signatureMethod: string
) {
  const { error } = await supabase
    .from('contracts')
    .update({
      submitted_at: new Date().toISOString(),
      signature_method: signatureMethod
    })
    .eq('subscription_id', subscriptionId);

  if (error) {
    console.error('Error recording contract submission:', error);
    throw error;
  }
}

/**
 * Update contract status after signing
 */
export async function updateContractStatus(
  subscriptionId: string,
  status: 'signed' | 'rejected',
  signedBy?: string,
  signatureMethod?: string,
  documentUrl?: string
) {
  const signedDate = new Date();
  const updates: any = {
    status,
    signed_by: signedBy,
    signature_method: signatureMethod,
    contract_document_url: documentUrl
  };

  if (status === 'signed') {
    updates.signed_at = signedDate.toISOString();
    
    // Also update the subscription version with the signed date
    const { error: versionError } = await supabase
      .from('subscription_versions')
      .update({
        contract_signed_date: signedDate.toISOString().split('T')[0], // DATE format
        start_date: signedDate.toISOString().split('T')[0] // Update start date to match signature date
      })
      .eq('subscription_id', subscriptionId)
      .eq('is_superseded', false);

    if (versionError) {
      console.error('Error updating subscription version with signed date:', versionError);
      throw versionError;
    }
  }

  const { error } = await supabase
    .from('contracts')
    .update(updates)
    .eq('subscription_id', subscriptionId);

  if (error) throw error;
}

/**
 * Get contract timeline for a subscription
 */
export async function getContractTimeline(subscriptionId: string) {
  const { data, error } = await supabase
    .from('contracts')
    .select(`
      id,
      status,
      contract_type,
      submitted_at,
      signed_at,
      signed_by,
      signature_method,
      contract_document_url,
      created_at
    `)
    .eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching contract timeline:', error);
    throw error;
  }

  return data;
}

/**
 * Get all pending contracts with submission info
 */
export async function getPendingContracts() {
  const { data, error } = await supabase
    .from('contracts')
    .select(`
      id,
      subscription_id,
      contract_type,
      submitted_at,
      signature_method,
      created_at,
      subscriptions (
        subscriber_id,
        subscribers (
          first_name,
          last_name,
          email
        )
      )
    `)
    .eq('status', 'pending')
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: true });

  if (error) {
    console.error('Error fetching pending contracts:', error);
    throw error;
  }

  return data;
}
