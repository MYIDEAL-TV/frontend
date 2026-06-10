import { getLocationConfig } from "@/config/locationConfig";
import { getAddonPrice, getPlanPrice } from "@/config/pricingConfig";

/**
 * Format addon price with currency based on location
 */
export function formatAddonPrice(addonId: string, locationId: string): string {
  const price = getAddonPrice(addonId);
  const locationConfig = getLocationConfig(locationId);
  const currency = locationConfig?.currency || "USD";
  
  if (currency === "EUR") {
    return `${price}€/mois`;
  }
  return `$${price}/month`;
}

/**
 * Format plan price with currency based on location
 */
export function formatPlanPrice(planId: string, locationId: string): string {
  const price = getPlanPrice(planId);
  const locationConfig = getLocationConfig(locationId);
  const currency = locationConfig?.currency || "USD";
  
  if (currency === "EUR") {
    return `${price}€/mois`;
  }
  return `$${price}/month`;
}

/**
 * Format a price with currency symbol
 */
export function formatPrice(price: number, currency: string): string {
  const formattedPrice = price.toFixed(2);
  if (currency === "EUR") {
    return `${formattedPrice}€`;
  }
  return `$${formattedPrice}`;
}
