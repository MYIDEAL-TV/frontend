import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./i18n";
import { AuthProvider } from "@/contexts/AuthContext";
import { ColorSchemeProvider } from "@/contexts/ColorSchemeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import ContractSuccess from "./pages/ContractSuccess";
import ContractSigningBridge from "./pages/ContractSigningBridge";
import Home from "./pages/Home";
import NewSubscription from "./pages/NewSubscription";
import ContractSummary from "./pages/ContractSummary";
import PDFFillerIntegration from "./pages/PDFFillerIntegration";
import ContractSecure from "./pages/ContractSecure";
import ContractApprover from "./pages/ContractApprover";
import Legal from "./pages/Legal";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Documentation from "./pages/Documentation";
import Kiosk from "@/pages/Kiosk"; // Check if it is in 'pages' or 'components'. Based on your logs, likely 'components'.
import ContractExit from "./pages/ContractExit";
import ProfileDashboard from "./pages/ProfessionalDashboard";
import ResetPassword from "./pages/ResetPassword";
import UpdatePassword from "./pages/UpdatePassword";

const queryClient = new QueryClient();

const App = () => (
  <ColorSchemeProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route
                path="/contract-signing-bridge"
                element={<ContractSigningBridge />}
              />
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/new-subscription"
                element={
                  <ProtectedRoute>
                    <NewSubscription />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contract-summary"
                element={
                  <ProtectedRoute>
                    <ContractSummary />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contract-integration"
                element={
                  <ProtectedRoute>
                    <PDFFillerIntegration />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contract-kiosk"
                element={
                  <ProtectedRoute>
                    <Kiosk />
                  </ProtectedRoute>
                }
              />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/profile" element={<ProfileDashboard />} />
              <Route path="/update-password" element={<UpdatePassword />} />
              <Route
                path="/contract-approver"
                element={
                  <ProtectedRoute>
                    <ContractApprover />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contract-secure"
                element={
                  <ProtectedRoute>
                    <ContractSecure />
                  </ProtectedRoute>
                }
              />
              <Route path="/contract-success" element={<ContractSuccess />} />
              <Route
                path="/legal"
                element={
                  <ProtectedRoute>
                    <Legal />
                  </ProtectedRoute>
                }
              />
              <Route path="/doc" element={<Documentation />} />
              <Route path="/contract-exit" element={<ContractExit />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ColorSchemeProvider>
);

export default App;
