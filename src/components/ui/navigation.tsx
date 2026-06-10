import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, Home, Plus, Users, LogOut, UserCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "@/components/ui/language-selector";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ColorSchemeSwitcher } from "@/components/ColorSchemeSwitcher";

export const Navigation = () => {
  const location = useLocation();
  const { t } = useTranslation("common");
  const { user, signOut } = useAuth();

  // FIXED: Destructuring the properties that actually exist on your hook
  const { isAdmin, isStaff, isCustomer, loading: roleLoading } = useUserRole();
  // Logic to determine role access
  const isStaffOrAdmin = isAdmin || isStaff;

  const navItems = [
    { href: "/", label: t("navigation.home"), icon: Home, visible: true },
    {
      href: "/new-subscription",
      label: t("navigation.newSubscription"),
      icon: Plus,
      visible: isStaffOrAdmin, // Hidden for Customers
    },
    {
      href: "/legal",
      label: t("navigation.legal"),
      icon: FileText,
      visible: true,
    },
  ];

  const getUserInitials = () => {
    if (!user?.email) return "?";
    return user.email.substring(0, 2).toUpperCase();
  };

  const getRoleLabel = () => {
    if (isAdmin) return "Admin";
    if (isStaff) return "Staff";
    if (isCustomer) return "Customer";
    return "User";
  };

  return (
    <nav className="bg-card border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold text-foreground">
              {t("navigation.brand")}
            </h1>
          </div>

          <div className="flex items-center space-x-1">
            {!roleLoading &&
              navItems
                .filter((item) => item.visible)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;

                  return (
                    <Button
                      key={item.href}
                      variant={isActive ? "default" : "ghost"}
                      asChild
                      className="flex items-center space-x-2"
                    >
                      <Link to={item.href}>
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{item.label}</span>
                      </Link>
                    </Button>
                  );
                })}

            <LanguageSelector />
            <ColorSchemeSwitcher />

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full"
                  >
                    <Avatar>
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.email}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground mt-1">
                        {getRoleLabel()}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {/* CUSTOMER ACCESS: My Account */}
                  {isCustomer && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link
                          to="/profile"
                          className="cursor-pointer flex items-center"
                        >
                          <UserCheck className="mr-2 h-4 w-4" />
                          <span>My Account</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
