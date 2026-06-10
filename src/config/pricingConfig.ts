import { getLocationConfig } from "./locationConfig";

// Plan pricing configuration
export const planPrices: Record<string, number> = {
  // US plans
  basic_us: 29,
  full_us: 89,

  // French plans
  basic_fr: 29,
  full_fr: 89,

  // Saint Barthélemy plan
  sbh: 89,
};

// Addon pricing configuration
export const addonPrices: Record<string, number> = {
  // US addons
  family_us: 25,
  sport_us: 25,
  cinema_us: 16,
  kids_us: 6,
  // cine_us: 15,

  // French addons
  family_fr: 25,
  sport_fr: 25,
  cinema_fr: 16,
  kids_fr: 6,
};

// Screen pricing per location (per additional screen per month)
export const screenPrices: Record<string, number> = {
  "saint-barthelemy": 20,
  "saint-martin": 10,
  "sint-maarten": 10,
  other: 20,
};

/**
 * Get the price for a specific plan
 */
export function getPlanPrice(planId: string): number {
  return planPrices[planId] || 0;
}

/**
 * Get the price for a specific addon
 */
export function getAddonPrice(addonId: string): number {
  return addonPrices[addonId] || 0;
}

/**
 * Get the price per additional screen for a location
 */
export function getScreenPrice(locationId: string): number {
  return screenPrices[locationId] || 20;
}

/**
 * Get the decoder rental price for a location
 */
export function getDecoderRentalPrice(locationId: string): number {
  const config = getLocationConfig(locationId);
  return config?.decoderRentalPrice || 0;
}

/**
 * Get the decoder purchase price for a location
 */
export function getDecoderPurchasePrice(locationId: string): number {
  const config = getLocationConfig(locationId);
  return config?.decoderPurchasePrice || 499;
}

/**
 * Calculate total additional screens cost
 */
export function calculateAdditionalScreensCost(locationId: string, totalScreens: number, planQuantity: number): number {
  const additionalScreens = Math.max(0, totalScreens - planQuantity);
  const pricePerScreen = getScreenPrice(locationId);
  return additionalScreens * pricePerScreen;
}

/**
 * Calculate total decoder rental cost
 */
export function calculateDecoderRentalCost(locationId: string, totalDecoders: number): number {
  const pricePerDecoder = getDecoderRentalPrice(locationId);
  return totalDecoders * pricePerDecoder;
}

/**
 * Calculate plan quantity based on total screens
 * Formula: Math.ceil(totalScreens / (maxScreens + 1))
 * Example: maxScreens = 3
 *   - 1-4 screens → 1 plan
 *   - 5-8 screens → 2 plans
 *   - 9-12 screens → 3 plans
 */
export function calculatePlanQuantity(totalScreens: number, maxScreens: number): number {
  if (totalScreens < 1) return 1;
  return Math.ceil(totalScreens / (maxScreens + 1));
}

/**
 * Calculate the base monthly price for ONE plan + ONE set of addons
 */
export function calculateBaseMonthlyPrice(planId: string, addonIds: string[]): number {
  const planPrice = getPlanPrice(planId);
  const addonsTotal = addonIds.reduce((sum, addonId) => sum + getAddonPrice(addonId), 0);
  return planPrice + addonsTotal;
}

/**
 * Calculate suggested discount based on remainder
 * Returns { shouldApplyDiscount, discountAmount, discountPercentage }
 */
export function calculateSuggestedDiscount(
  planQuantity: number,
  totalScreens: number,
  maxScreens: number,
  baseMonthlyPrice: number,
): { shouldApplyDiscount: boolean; discountAmount: number; discountPercentage: number } {
  // No discount if plan quantity is less than 2
  if (planQuantity < 2) {
    return { shouldApplyDiscount: false, discountAmount: 0, discountPercentage: 0 };
  }

  const remainder = totalScreens % (maxScreens + 1);

  // No discount if remainder is 0
  if (remainder === 0) {
    return { shouldApplyDiscount: false, discountAmount: 0, discountPercentage: 0 };
  }

  // Determine discount percentage based on remainder
  let discountPercentage = 0;
  if (remainder === 1) discountPercentage = 50;
  else if (remainder === 2) discountPercentage = 25;
  else if (remainder === 3) discountPercentage = 10;

  const discountAmount = (baseMonthlyPrice * discountPercentage) / 100;

  return { shouldApplyDiscount: true, discountAmount, discountPercentage };
}
