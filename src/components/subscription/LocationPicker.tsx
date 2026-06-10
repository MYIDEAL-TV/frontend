import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

// Fallback to localhost if env variable is missing
const VITE_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const env = import.meta.env.VITE_ENVIRONMENT || "development";

interface LocationPickerProps {
  value: string;
  onChange: (value: string) => void;
}

interface DBLocation {
  id: string | number;
  name: string;
  state_province?: string;
}

export const LocationPicker = ({ value, onChange }: LocationPickerProps) => {
  const { t } = useTranslation("subscription");

  // Dynamic State
  const [locations, setLocations] = useState<DBLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
  const fetchLocations = async () => {
    try {
      // 1. Get the current Supabase Project ID from the environment variables
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      
      // 2. Construct the local storage key dynamically
      const storageKey = `sb-${projectId}-auth-token`;
      
      // 3. Safely parse the token
      const sessionData = JSON.parse(localStorage.getItem(storageKey) || "{}");
      const token = sessionData.access_token;

      const response = await fetch(`${VITE_API_URL}/api/admin/locations`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, 
        },
      });

      const data = await response.json();

      if (data.success) {
        setLocations(data.locations);
      } else {
        setError("Failed to load regions from database.");
      }
    } catch (err) {
      console.error("Location fetch error:", err);
      setError("Network error while loading regions.");
    } finally {
      setIsLoading(false);
    }
  };

  fetchLocations();
}, []);

  // --- 🛠️ UPDATED: THE SYNCHRONIZATION EFFECT ---
  useEffect(() => {
    if (!isLoading && locations.length > 0 && value) {
      // 1. SAFE EXTRACTION: Handle if value is "2" OR { id: "2" }
      const resumedId =
        typeof value === "object" && value !== null
          ? (value as any).id?.toString()
          : value.toString();

      // 2. SEARCH: Compare strings to strings
      const exists = locations.find((loc) => loc.id.toString() === resumedId);

      if (exists) {
        console.log("📍 Location Sync: Success! Matched ID", resumedId);
        // Ensure we pass back the string ID to stay consistent with Select requirements
        onChange(exists.id.toString());
      } else {
        console.warn(
          "📍 Location Sync: ID not found in fetched list",
          resumedId
        );
      }
    }
  }, [isLoading, locations, value]);

  return (
    <div className="form-section">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {t("location.title")}
        </h2>
        <p className="text-muted-foreground text-sm">
          Select the operational region for this subscription.
        </p>
      </div>

      <div className="space-y-3">
        <Label
          htmlFor="location"
          className="text-base font-medium flex items-center justify-between"
        >
          <span>{t("location.label")} *</span>
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
        </Label>

        <Select
          // --- 🛠️ UPDATED: SAFE VALUE SELECTION ---
          value={
            (typeof value === "object" && value !== null
              ? (value as any).id?.toString()
              : value?.toString()) || ""
          }
          onValueChange={onChange}
          disabled={isLoading || !!error || locations.length === 0}
        >
          <SelectTrigger className={`w-full ${error ? "border-red-500" : ""}`}>
            <SelectValue
              placeholder={
                error
                  ? "Error loading regions"
                  : isLoading
                  ? "Loading operational regions..."
                  : t("location.placeholder")
              }
            />
          </SelectTrigger>
          <SelectContent>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id.toString()}>
                {loc.name} {loc.state_province ? `(${loc.state_province})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {error && (
          <p className="text-xs font-bold text-red-500 mt-1">{error}</p>
        )}
      </div>
    </div>
  );
};
