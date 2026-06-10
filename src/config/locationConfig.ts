export interface LocationConfig {
  id: string;
  name: string;
  availablePlans: string[];
  availableAddons: string[];
  currency: string;
  maxAdditionalScreens: number;
  allowDecoderPurchase: boolean;
  decoderRentalPrice: number;
  decoderPurchasePrice: number;
  language: string;
}

export const locationConfigs: Record<string, LocationConfig> = {
  "saint-barthelemy": {
    id: "saint-barthelemy",
    name: "Saint Barthélemy",
    availablePlans: ["sbh"],
    availableAddons: ["cinema_fr"],
    currency: "EUR",
    maxAdditionalScreens: 3,
    allowDecoderPurchase: true,
    decoderRentalPrice: 10,
    decoderPurchasePrice: 499,
    language: "fr",
  },
  "saint-martin": {
    id: "saint-martin",
    name: "Saint-Martin",
    availablePlans: ["basic_fr", "full_fr"],
    availableAddons: ["sport_fr", "cinema_fr", "kids_fr", "family_fr"],
    currency: "EUR",
    maxAdditionalScreens: 3,
    allowDecoderPurchase: true,
    decoderRentalPrice: 6,
    decoderPurchasePrice: 499,
    language: "fr",
  },
  "sint-maarten": {
    id: "sint-maarten",
    name: "Sint-Maarten",
    availablePlans: ["basic_us", "full_us"],
    availableAddons: ["sport_us", "cinema_us", "kids_us", "family_us"],
    currency: "USD",
    maxAdditionalScreens: 3,
    allowDecoderPurchase: true,
    decoderRentalPrice: 6,
    decoderPurchasePrice: 499,
    language: "en",
  },
  other: {
    id: "other",
    name: "Other",
    availablePlans: ["basic_us"],
    availableAddons: ["cine_us"],
    currency: "USD",
    maxAdditionalScreens: 3,
    allowDecoderPurchase: true,
    decoderRentalPrice: 6,
    decoderPurchasePrice: 499,
    language: "en",
  },
};

export function getLocationConfig(locationId: string): LocationConfig | null {
  return locationConfigs[locationId] || null;
}
