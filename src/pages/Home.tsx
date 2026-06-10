import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navigation } from "@/components/ui/navigation";
import { Search, Plus, Users, FileText, BarChart3, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const Home = () => {
  const [searchId, setSearchId] = useState("");
  const { t } = useTranslation("home");

  const features = [
    {
      icon: Plus,
      title: t("quickActions.newSubscription.title"),
      description: t("quickActions.newSubscription.description"),
      href: "/new-subscription",
      color: "text-primary",
    },
    {
      icon: Search,
      title: t("quickActions.findSubscription.title"),
      description: t("quickActions.findSubscription.description"),
      href: "#",
      color: "text-success",
    },
    {
      icon: BarChart3,
      title: t("quickActions.analytics.title"),
      description: t("quickActions.analytics.description"),
      href: "#",
      color: "text-warning",
    },
    {
      icon: FileText,
      title: t("quickActions.legalDocuments.title"),
      description: t("quickActions.legalDocuments.description"),
      href: "/legal",
      color: "text-destructive",
    },
  ];

  const stats = [
    { label: t("stats.activeSubscriptions"), value: "2,847", change: "+12%" },
    { label: t("stats.monthlyRevenue"), value: "$284,720", change: "+8%" },
    { label: t("stats.newCustomers"), value: "156", change: "+24%" },
    { label: t("stats.retentionRate"), value: "94.2%", change: "+2%" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="hero-gradient text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              {t("hero.title")}
              <span className="block text-white/90">{t("hero.subtitle")}</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-3xl mx-auto">{t("hero.description")}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-3">
                <Link to="/new-subscription">
                  <Plus className="mr-2 h-5 w-5" />
                  {t("hero.createNew")}
                </Link>
              </Button>
              {/*<Button
                variant="outline"
                size="lg"
                className="border-white/20 text-white hover:bg-white/10 text-lg px-8 py-3"
              >
                <Search className="mr-2 h-5 w-5" />
                {t("hero.findExisting")}
              </Button>*/}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Quick Stats
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card key={index} className="card-professional animate-scale-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                  <div className="text-sm text-success font-medium">{stat.change}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section> */}

        {/* Quick Actions 
        <section className="mb-12">
          <h2 className="text-3xl font-semibold text-foreground mb-8 text-center">{t('quickActions.title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={index} 
                  className="card-professional group hover:scale-105 transition-all duration-200 animate-fade-in" 
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardHeader className="text-center pb-4">
                    <div className={`mx-auto w-12 h-12 rounded-full bg-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-muted-foreground text-sm mb-4">{feature.description}</p>
                    <Button asChild variant="outline" className="w-full">
                      <Link to={feature.href}>
                        {t('quickActions.getStarted')}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>*/}

        {/* Search Subscription */}
        <section className="mb-12 opacity-50 cursor-not-allowed">
          <Card className="card-professional max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl flex items-center justify-center space-x-2">
                <Search className="h-6 w-6 text-primary" />
                <span>{t("search.title")}</span>
                <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="search-id" className="text-base">
                    {t("search.label")}
                  </Label>
                  <Input
                    id="search-id"
                    placeholder={t("search.placeholder")}
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    className="mt-2"
                    disabled
                  />
                </div>
                <Button className="w-full btn-professional" disabled>
                  <Search className="mr-2 h-4 w-4" />
                  {t("search.button")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Security Notice */}
        <section>
          <Card className="card-professional border-muted bg-muted/30">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <Shield className="h-6 w-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-2">{t("security.title")}</h3>
                  <p className="text-muted-foreground text-sm">{t("security.description")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default Home;
