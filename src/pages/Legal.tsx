import { Navigation } from "@/components/ui/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Shield, CreditCard, ScrollText, ClipboardList } from "lucide-react";
import { useTranslation } from "react-i18next";

const Legal = () => {
  const { t } = useTranslation('legal');
  
  // Map tab IDs to translation keys
  const legalSections = [
    {
      id: "generalConditions",
      translationKey: "generalConditions",
      icon: FileText,
    },
    {
      id: "withdrawalMandates", 
      translationKey: "withdrawalMandates",
      icon: CreditCard,
    },
    {
      id: "privacyPolicy",
      translationKey: "privacyPolicy", 
      icon: Shield,
    },
    {
      id: "contractSummary",
      translationKey: "contractSummary",
      icon: ScrollText,
    },
    {
      id: "standardizedSheet",
      translationKey: "standardizedSheet",
      icon: ClipboardList,
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">{t('pageTitle')}</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('pageDescription')}
          </p>
        </div>

        {/* Legal Content */}
        <Tabs defaultValue="generalConditions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 h-auto p-1">
            {legalSections.map((section) => {
              const Icon = section.icon;
              return (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  className="flex flex-col items-center space-y-2 p-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{t(`${section.translationKey}.title`)}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {legalSections.map((section) => {
            const content = t(`${section.translationKey}.content`, { returnObjects: true }) as any;
            const sections = content?.sections || [];
            
            return (
              <TabsContent key={section.id} value={section.id} className="space-y-6">
                <Card className="card-professional">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-3 text-2xl">
                      <section.icon className="h-7 w-7 text-primary" />
                      <span>{content?.title}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {sections.map((item: any, index: number) => (
                      <div key={index} className="border-l-4 border-primary/20 pl-6 py-2">
                        <h3 className="text-lg font-semibold text-foreground mb-3">
                          {item.heading}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                          {item.content}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>

        {/* Contact Information */}
        <Card className="card-professional mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ScrollText className="h-6 w-6 text-primary" />
              <span>{t('contact.title')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-foreground mb-2">{t('contact.legalInquiries')}</h3>
                <p className="text-muted-foreground text-sm">
                  {t('contact.legalInquiriesDesc')}
                </p>
                <p className="text-primary font-medium mt-1">{t('contact.legalEmail')}</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">{t('contact.dataProtectionOfficer')}</h3>
                <p className="text-muted-foreground text-sm">
                  {t('contact.dataProtectionDesc')}
                </p>
                <p className="text-primary font-medium mt-1">{t('contact.privacyEmail')}</p>
              </div>
            </div>
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>{t('contact.lastUpdated')}:</strong> {t('contact.lastUpdatedDate')}<br />
                {t('contact.lastUpdatedDesc')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Legal;