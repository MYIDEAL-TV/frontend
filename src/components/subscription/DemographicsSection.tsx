import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import type {
  OwnerInfo,
  ManagerInfo,
  FinancialManagerInfo,
  DeliveryInfo,
} from "@/pages/NewSubscription";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
// import PhoneInputWithCountrySelect from "react-phone-number-input";
import PhoneInput from "react-phone-number-input";
import { useUserRole } from "@/hooks/useUserRole";

export interface DemographicsSectionProps {
  location: string;
  owner: OwnerInfo;
  manager: ManagerInfo;
  financialManager: FinancialManagerInfo;
  delivery: DeliveryInfo;
  onOwnerChange: (owner: OwnerInfo) => void;
  onManagerChange: (manager: ManagerInfo) => void;
  onFinancialManagerChange: (financialManager: FinancialManagerInfo) => void;
  onDeliveryChange: (delivery: DeliveryInfo) => void;
  managerCopyFromOwner: boolean;
  financialManagerCopyFromOwner: boolean;
  deliveryCopyFromOwner: boolean;
  onManagerCopyChange: (checked: boolean) => void;
  onFinancialManagerCopyChange: (checked: boolean) => void;
  onDeliveryCopyChange: (checked: boolean) => void;
  contractType: string;
}
const sanitizeInput = (value: string): string => {
  return value.replace(/[<>]/g, "");
};

const capitalizeFirstName = (value: string): string => {
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const capitalizeLastName = (value: string): string => {
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export const DemographicsSection = ({
  location,
  owner,
  manager,
  financialManager,
  delivery,
  onOwnerChange,
  onManagerChange,
  onFinancialManagerChange,
  onDeliveryChange,
  managerCopyFromOwner,
  financialManagerCopyFromOwner,
  deliveryCopyFromOwner,
  onManagerCopyChange,
  onFinancialManagerCopyChange,
  onDeliveryCopyChange,
  contractType,
}: DemographicsSectionProps) => {
  const { t } = useTranslation(["subscription", "common"]);
  const { isCustomer } = useUserRole();

  // Set default city and postal code based on location
  useEffect(() => {
    if (location === "saint-barthelemy") {
      // Always update owner fields when location is Saint-Barthélemy
      onOwnerChange({
        ...owner,
        city: "SAINT-BARTHELEMY",
        postalCode: "97 133",
        country: "FRANCE",
      });

      // Only update manager fields if not copying from owner
      if (!managerCopyFromOwner) {
        onManagerChange({
          ...manager,
          city: "SAINT-BARTHELEMY",
          postalCode: "97 133",
          country: "FRANCE",
        });
      }
    } else if (location === "saint-martin") {
      // Always update owner fields when location is Saint-Martin
      onOwnerChange({
        ...owner,
        city: "SAINT-MARTIN",
        postalCode: "97 150",
        country: "FRANCE",
      });

      // Only update manager fields if not copying from owner
      if (!managerCopyFromOwner) {
        onManagerChange({
          ...manager,
          city: "SAINT-MARTIN",
          postalCode: "97 150",
          country: "FRANCE",
        });
      }
    } else if (location === "sint-maarten") {
      // Always update owner fields when location is Saint-Martin
      onOwnerChange({ ...owner, city: "SINT-MAARTEN", country: "NETHERLAND" });

      // Only update manager fields if not copying from owner
      if (!managerCopyFromOwner) {
        onManagerChange({
          ...manager,
          city: "SINT-MAARTEN",
          country: "NETHERLAND",
        });
      }
    }
  }, [location, managerCopyFromOwner]);

  // Set default delivery cell phone to manager's cell phone when available
  useEffect(() => {
    if (manager.cellPhone && !deliveryCopyFromOwner && !delivery.cellPhone) {
      onDeliveryChange({ ...delivery, cellPhone: manager.cellPhone });
    }
  }, [manager.cellPhone, deliveryCopyFromOwner]);

  const handleOwnerChange = (
    field: keyof OwnerInfo,
    value: string | boolean
  ) => {
    if (typeof value === "string") {
      let processedValue = sanitizeInput(value);
      if (field === "firstName") {
        processedValue = capitalizeFirstName(processedValue);
      } else if (field === "lastName") {
        processedValue = capitalizeLastName(processedValue);
      }
      onOwnerChange({ ...owner, [field]: processedValue });
    } else {
      onOwnerChange({ ...owner, [field]: value });
    }
  };

  const handleManagerChange = (field: keyof ManagerInfo, value: string) => {
    let processedValue = sanitizeInput(value);
    if (field === "firstName") {
      processedValue = capitalizeFirstName(processedValue);
    } else if (field === "lastName") {
      processedValue = capitalizeLastName(processedValue);
    }
    onManagerChange({ ...manager, [field]: processedValue });
  };

  const handleFinancialManagerChange = (
    field: keyof FinancialManagerInfo,
    value: string
  ) => {
    let processedValue = sanitizeInput(value);
    if (field === "firstName") {
      processedValue = capitalizeFirstName(processedValue);
    } else if (field === "lastName") {
      processedValue = capitalizeLastName(processedValue);
    }
    onFinancialManagerChange({ ...financialManager, [field]: processedValue });
  };

  const handleDeliveryChange = (field: keyof DeliveryInfo, value: string) => {
    onDeliveryChange({ ...delivery, [field]: sanitizeInput(value) });
  };

  const handleManagerCopyToggle = (checked: boolean) => {
    onManagerCopyChange(checked);
    if (checked) {
      onManagerChange({
        firstName: capitalizeFirstName(owner.firstName),
        lastName: capitalizeLastName(owner.lastName),
        email: owner.email,
        cellPhone: owner.cellPhone,
        companyName: owner.companyName,
        address: owner.address,
        city: owner.city,
        postalCode: owner.postalCode,
        country: owner.country,
      });
    }
  };

  const handleFinancialManagerCopyToggle = (checked: boolean) => {
    onFinancialManagerCopyChange(checked);
    if (checked) {
      onFinancialManagerChange({
        firstName: capitalizeFirstName(owner.firstName),
        lastName: capitalizeLastName(owner.lastName),
        email: owner.email,
        cellPhone: owner.cellPhone,
        landlinePhone: owner.landlinePhone,
      });
    }
  };

  const handleDeliveryCopyToggle = (checked: boolean) => {
    onDeliveryCopyChange(checked);
    if (checked) {
      onDeliveryChange({
        address: owner.address,
        city: owner.city,
        postalCode: owner.postalCode,
        cellPhone: owner.cellPhone,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          {t("subscription:demographics.title")}
        </h2>
        <p className="text-muted-foreground">
          {t("subscription:demographics.description")}
        </p>
      </div>

      {/* Section 1: Owner/Tenant */}
      <Card className="card-professional">
        <CardHeader>
          <CardTitle>{t("subscription:demographics.owner")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner-firstName">
                {t("common:forms.firstName")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="owner-firstName"
                value={owner.firstName}
                onChange={(e) => handleOwnerChange("firstName", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner-lastName">
                {t("common:forms.lastName")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="owner-lastName"
                value={owner.lastName}
                onChange={(e) => handleOwnerChange("lastName", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner-email">
                {t("common:forms.email")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="owner-email"
                type="email"
                value={owner.email}
                onChange={(e) => handleOwnerChange("email", e.target.value)}
                required
                disabled={isCustomer} // <--- ADD THIS PROPERTY
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner-cellPhone">
                {t("common:forms.cellPhone")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <PhoneInput
                international
                defaultCountry="MF"
                value={owner.cellPhone}
                onChange={(value) =>
                  onOwnerChange({ ...owner, cellPhone: value || "" })
                }
                inputComponent={Input}
                // This class ensures the container behaves correctly
                className="flex items-center gap-2"
                // Inline styling for the select component and its nested options
                selectComponentProps={{
                  className:
                    "bg-slate-900 text-white border border-slate-700 rounded-md h-10 px-2 cursor-pointer",
                  style: {
                    // Backup forced colors in case Tailwind is overwritten by the library CSS
                    backgroundColor: "#0f172a",
                    color: "#ffffff",
                  },
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner-landlinePhone">
                {t("common:forms.landlinePhone")}
              </Label>
              <Input
                id="owner-landlinePhone"
                type="tel"
                value={owner.landlinePhone}
                onChange={(e) =>
                  handleOwnerChange("landlinePhone", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner-companyName">
                {t("common:forms.companyName")}
              </Label>
              <Input
                id="owner-companyName"
                value={owner.companyName}
                onChange={(e) =>
                  handleOwnerChange("companyName", e.target.value)
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner-accommodationName">
              {t("common:forms.accommodationName")}
            </Label>
            <Input
              id="owner-accommodationName"
              value={owner.accommodationName}
              onChange={(e) =>
                handleOwnerChange("accommodationName", e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner-address">{t("common:forms.address")}</Label>
            <Input
              id="owner-address"
              value={owner.address}
              onChange={(e) => handleOwnerChange("address", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner-city">{t("common:forms.city")}</Label>
              <Input
                id="owner-city"
                value={owner.city}
                onChange={(e) => handleOwnerChange("city", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner-postalCode">
                {t("common:forms.postalCode")}
              </Label>
              <Input
                id="owner-postalCode"
                value={owner.postalCode}
                onChange={(e) =>
                  handleOwnerChange("postalCode", e.target.value)
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner-country">{t("common:forms.country")}</Label>
            <Input
              id="owner-country"
              value={owner.country}
              onChange={(e) => handleOwnerChange("country", e.target.value)}
            />
          </div>

          <div className="flex items-start space-x-2 pt-4 border-t">
            <Checkbox
              id="owner-marketing"
              checked={owner.acceptsMarketing}
              onCheckedChange={(checked) =>
                handleOwnerChange("acceptsMarketing", checked as boolean)
              }
            />
            <Label
              htmlFor="owner-marketing"
              className="font-normal text-sm leading-relaxed cursor-pointer"
            >
              {t("subscription:demographics.marketingConsent")}
            </Label>
          </div>
        </CardContent>
      </Card>
      {!isCustomer && (
        <Card className="card-professional">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t("subscription:demographics.manager")}</CardTitle>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="copy-manager"
                  checked={managerCopyFromOwner}
                  onCheckedChange={handleManagerCopyToggle}
                />
                <Label
                  htmlFor="copy-manager"
                  className="text-sm font-normal cursor-pointer"
                >
                  {t("subscription:demographics.copyFromOwner")}
                </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manager-firstName">
                  {t("common:forms.firstName")}
                </Label>
                <Input
                  id="manager-firstName"
                  value={manager.firstName}
                  onChange={(e) =>
                    handleManagerChange("firstName", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager-lastName">
                  {t("common:forms.lastName")}
                </Label>
                <Input
                  id="manager-lastName"
                  value={manager.lastName}
                  onChange={(e) =>
                    handleManagerChange("lastName", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manager-email">{t("common:forms.email")}</Label>
                <Input
                  id="manager-email"
                  type="email"
                  value={manager.email}
                  onChange={(e) => handleManagerChange("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager-cellPhone">
                  {t("common:forms.cellPhone")}
                </Label>
                <Input
                  id="manager-cellPhone"
                  type="tel"
                  value={manager.cellPhone}
                  onChange={(e) =>
                    handleManagerChange("cellPhone", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manager-companyName">
                {t("common:forms.companyName")}
              </Label>
              <Input
                id="manager-companyName"
                value={manager.companyName}
                onChange={(e) =>
                  handleManagerChange("companyName", e.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="manager-address">
                {t("common:forms.address")}
              </Label>
              <Input
                id="manager-address"
                value={manager.address}
                onChange={(e) => handleManagerChange("address", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manager-city">{t("common:forms.city")}</Label>
                <Input
                  id="manager-city"
                  value={manager.city}
                  onChange={(e) => handleManagerChange("city", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager-postalCode">
                  {t("common:forms.postalCode")}
                </Label>
                <Input
                  id="manager-postalCode"
                  value={manager.postalCode}
                  onChange={(e) =>
                    handleManagerChange("postalCode", e.target.value)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Section 3: Financial Manager */}
      {!isCustomer && (
        <Card className="card-professional">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {t("subscription:demographics.financialManager")}
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="copy-financial"
                  checked={financialManagerCopyFromOwner}
                  onCheckedChange={handleFinancialManagerCopyToggle}
                />
                <Label
                  htmlFor="copy-financial"
                  className="text-sm font-normal cursor-pointer"
                >
                  {t("subscription:demographics.copyFromOwner")}
                </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="financial-firstName">
                  {t("common:forms.firstName")}
                  {contractType === "professional" && (
                    <span className="text-destructive"> *</span>
                  )}
                </Label>
                <Input
                  id="financial-firstName"
                  value={financialManager.firstName}
                  onChange={(e) =>
                    handleFinancialManagerChange("firstName", e.target.value)
                  }
                  required={contractType === "professional"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="financial-lastName">
                  {t("common:forms.lastName")}
                  {contractType === "professional" && (
                    <span className="text-destructive"> *</span>
                  )}
                </Label>
                <Input
                  id="financial-lastName"
                  value={financialManager.lastName}
                  onChange={(e) =>
                    handleFinancialManagerChange("lastName", e.target.value)
                  }
                  required={contractType === "professional"}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="financial-email">
                  {t("common:forms.email")}
                  {contractType === "professional" && (
                    <span className="text-destructive"> *</span>
                  )}
                </Label>
                <Input
                  id="financial-email"
                  type="email"
                  value={financialManager.email}
                  onChange={(e) =>
                    handleFinancialManagerChange("email", e.target.value)
                  }
                  required={contractType === "professional"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="financial-cellPhone">
                  {t("common:forms.cellPhone")}
                  {contractType === "professional" && (
                    <span className="text-destructive"> *</span>
                  )}
                </Label>
                <Input
                  id="financial-cellPhone"
                  type="tel"
                  value={financialManager.cellPhone}
                  onChange={(e) =>
                    handleFinancialManagerChange("cellPhone", e.target.value)
                  }
                  required={contractType === "professional"}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="financial-landlinePhone">
                {t("common:forms.landlinePhone")}
              </Label>
              <Input
                id="financial-landlinePhone"
                type="tel"
                value={financialManager.landlinePhone}
                onChange={(e) =>
                  handleFinancialManagerChange("landlinePhone", e.target.value)
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 4: Delivery Details */}
      <Card className="card-professional">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("subscription:demographics.delivery")}</CardTitle>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="copy-delivery"
                checked={deliveryCopyFromOwner}
                onCheckedChange={handleDeliveryCopyToggle}
              />
              <Label
                htmlFor="copy-delivery"
                className="text-sm font-normal cursor-pointer"
              >
                {t("subscription:demographics.copyFromOwner")}
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {t("subscription:demographics.deliveryNote")}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="delivery-address">
              {t("common:forms.address")}
            </Label>
            <Input
              id="delivery-address"
              value={delivery.address}
              onChange={(e) => handleDeliveryChange("address", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="delivery-city">{t("common:forms.city")}</Label>
              <Input
                id="delivery-city"
                value={delivery.city}
                onChange={(e) => handleDeliveryChange("city", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery-postalCode">
                {t("common:forms.postalCode")}
              </Label>
              <Input
                id="delivery-postalCode"
                value={delivery.postalCode}
                onChange={(e) =>
                  handleDeliveryChange("postalCode", e.target.value)
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery-cellPhone">
              {t("common:forms.cellPhone")}
            </Label>
            <Input
              id="delivery-cellPhone"
              type="tel"
              value={delivery.cellPhone}
              onChange={(e) =>
                handleDeliveryChange("cellPhone", e.target.value)
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
