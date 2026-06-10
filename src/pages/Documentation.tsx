import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Printer, LogOut, FileText } from 'lucide-react';
import { toast } from 'sonner';
import mermaid from 'mermaid';
import SubscriptionFlowChart from '@/components/documentation/SubscriptionFlowChart';

const Documentation = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const authStatus = sessionStorage.getItem('docAuth');
    if (authStatus === 'authenticated') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && mermaidRef.current) {
      mermaid.initialize({ 
        startOnLoad: true,
        theme: 'default',
        securityLevel: 'loose',
        themeVariables: {
          background: '#ffffff',
          primaryColor: '#ffffff',
          primaryTextColor: '#000000',
          primaryBorderColor: '#000000',
          lineColor: '#000000',
          secondaryColor: '#f4f4f4',
          tertiaryColor: '#ffffff',
          noteBkgColor: '#ffffff',
          noteTextColor: '#000000',
          noteBorderColor: '#000000',
          actorBkg: '#ffffff',
          actorBorder: '#000000',
          actorTextColor: '#000000',
          actorLineColor: '#000000',
          signalColor: '#000000',
          signalTextColor: '#000000',
          labelBoxBkgColor: '#f4f4f4',
          labelBoxBorderColor: '#000000',
          labelTextColor: '#000000',
        }
      });
      mermaid.contentLoaded();
    }
  }, [isAuthenticated]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      if (password === 'ZEdoc') {
        sessionStorage.setItem('docAuth', 'authenticated');
        setIsAuthenticated(true);
        toast.success('Access granted');
      } else {
        toast.error('Incorrect password');
      }
      setIsLoading(false);
    }, 500);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('docAuth');
    setIsAuthenticated(false);
    setPassword('');
    toast.info('Logged out');
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Documentation Access</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Enter password to view subscription flow documentation
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Authenticating...' : 'Access Documentation'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Subscription Flow Documentation</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print/PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              New Subscription Creation & Contract Sending Flow
            </h1>
            <p className="text-muted-foreground text-lg">
              Complete technical documentation of the subscription workflow
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">
                This document details the complete flow from creating a new subscription through the UI
                to sending a contract via SignNow. The process involves multiple layers:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-4 text-foreground">
                <li><strong>UI Layer</strong>: Multi-step form in NewSubscription.tsx</li>
                <li><strong>Service Layer</strong>: Business logic in subscriptionService.ts</li>
                <li><strong>Edge Functions</strong>: Contract generation via signnow-contract (direct) and signnow-essentials (approver flow)</li>
                <li><strong>External API</strong>: SignNow integration for e-signatures</li>
              </ul>
            </CardContent>
          </Card>

          {/* NEW: Signature Flows Overview */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Signature Flows</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground">
                The system supports three distinct signature workflows:
              </p>
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">1. Direct Signer Flow (signnow-contract)</h4>
                <p className="text-sm text-muted-foreground">
                  Contract is sent directly to the signer (subscriber). The signer receives the contract via 
                  embed, email, or SMS and signs it themselves. Used for standard remote signatures.
                </p>
              </div>
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">2. Approver Flow (signnow-essentials)</h4>
                <p className="text-sm text-muted-foreground">
                  Two-step process: An approver (typically staff) signs first using an embedded iframe, 
                  then the contract is automatically routed to the signer for their signature via email.
                  Uses pre-filled templates with optional embedded T&C legal package.
                </p>
              </div>
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">3. Summary Only (No SignNow)</h4>
                <p className="text-sm text-muted-foreground">
                  Creates the subscription record without SignNow integration. Used for in-person 
                  signatures or contracts handled outside the system.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-4">Flow Diagram</h2>
            <Card>
              <CardContent className="pt-6">
                <div className="bg-white p-4 rounded-lg overflow-x-auto">
                  <SubscriptionFlowChart />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-4">Sequence Diagram</h2>
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground mb-4">
                  This sequence diagram shows the interactions between different components during the subscription and contract creation process:
                </p>
                <div className="mermaid bg-white p-6 rounded-lg overflow-x-auto">
{`sequenceDiagram
    participant User
    participant UI as Frontend UI
    participant Service as subscriptionService
    participant DB as Database
    participant EdgeDirect as signnow-contract
    participant EdgeApprover as signnow-essentials
    participant SignNow as SignNow API

    User->>UI: Fill form (5 steps)
    User->>UI: Choose Signature Method
    
    alt Summary Only
        UI->>UI: Navigate to /contract-summary
    else Secure Remote
        UI->>UI: Navigate to /contract-secure
    else Approver Flow
        UI->>UI: Navigate to /contract-approver
    end
    
    UI->>Service: createInitialSubscription(formData)
    
    Service->>DB: Find existing subscriber
    DB-->>Service: Subscriber data or null
    
    alt New Subscriber
        Service->>DB: Insert new subscriber
        DB-->>Service: subscriber_id
    end
    
    Service->>DB: Insert subscription record
    DB-->>Service: subscription_id
    
    Service->>DB: Insert subscription_version + addons
    DB-->>Service: version_id
    
    Service->>DB: Insert managers, financial_managers
    Service->>DB: Insert delivery_address
    Service->>DB: Insert contract record (pending)
    DB-->>Service: contract_id
    
    alt Direct Signer Flow
        Service->>EdgeDirect: POST /signnow-contract
        EdgeDirect->>SignNow: POST /oauth2/token
        SignNow-->>EdgeDirect: access_token
        EdgeDirect->>SignNow: GET location template
        EdgeDirect->>SignNow: POST prefill smart fields
        EdgeDirect->>SignNow: POST create document copy
        opt Legal Package Enabled
            EdgeDirect->>SignNow: POST merge legal template
        end
        opt SEPA Mandate Enabled
            EdgeDirect->>SignNow: POST merge SEPA template
        end
        EdgeDirect->>SignNow: PUT assign location brand
        EdgeDirect->>SignNow: POST create signing session
        EdgeDirect->>SignNow: POST generate signing link
        EdgeDirect->>DB: UPDATE contract with SignNow IDs
        EdgeDirect-->>Service: Return signing_link
    else Approver Flow
        Service->>EdgeApprover: POST /signnow-essentials
        EdgeApprover->>SignNow: POST /oauth2/token
        SignNow-->>EdgeApprover: access_token
        EdgeApprover->>SignNow: GET approver template (with/without T&C)
        EdgeApprover->>SignNow: POST prefill smart fields
        EdgeApprover->>SignNow: POST create document copy
        opt SEPA Mandate Enabled
            EdgeApprover->>SignNow: POST merge SEPA template
        end
        EdgeApprover->>SignNow: PUT assign location brand
        EdgeApprover->>SignNow: POST setup 2-step routing
        EdgeApprover->>SignNow: POST create embedded invite (approver)
        EdgeApprover->>DB: UPDATE contract with SignNow IDs
        EdgeApprover-->>Service: Return embedded_link for approver
        Note over User,SignNow: Approver signs in embedded iframe
        SignNow-->>User: Email sent to signer automatically
    end
    
    Service-->>UI: Return subscription_id & contract_id
    UI->>User: Navigate to success page`}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>1. UI Layer - Key Pages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">NewSubscription.tsx</h3>
                  <p className="text-muted-foreground mb-4">
                    Multi-step wizard for collecting subscription information:
                  </p>
                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <p><strong className="text-foreground">Step 1:</strong> <span className="text-muted-foreground">Location Selection (saint-barthelemy, saint-martin, sint-maarten, other)</span></p>
                    <p><strong className="text-foreground">Step 2:</strong> <span className="text-muted-foreground">Plan Selection (location-specific plans, add-ons, screen quantities)</span></p>
                    <p><strong className="text-foreground">Step 3:</strong> <span className="text-muted-foreground">Hardware & Fees (decoder rental/purchase, installation, equipment)</span></p>
                    <p><strong className="text-foreground">Step 4:</strong> <span className="text-muted-foreground">Demographics (subscriber, manager, financial manager, delivery)</span></p>
                    <p><strong className="text-foreground">Step 5:</strong> <span className="text-muted-foreground">Signature Options (SEPA, Legal Package, Send Method)</span></p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Contract Pages</h3>
                  <div className="space-y-2">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p><strong className="text-foreground">/contract-secure:</strong> <span className="text-muted-foreground">Direct signer flow - calls signnow-contract edge function</span></p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p><strong className="text-foreground">/contract-approver:</strong> <span className="text-muted-foreground">Approver flow - calls signnow-essentials, displays embedded signing iframe</span></p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p><strong className="text-foreground">/contract-summary:</strong> <span className="text-muted-foreground">Summary only - no SignNow integration</span></p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p><strong className="text-foreground">/contract-success:</strong> <span className="text-muted-foreground">Success confirmation page</span></p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Send Methods</h3>
                  <div className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
                    <pre className="text-sm text-slate-100"><code>{`// Available send methods for direct signer flow
sendMethod: "embed" | "email" | "sms"

// embed - Embedded signing in iframe (default)
// email - Signing link sent via email to signer
// sms   - Signing link sent via SMS to signer`}</code></pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Service Layer - subscriptionService.ts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">createInitialSubscription()</h3>
                  <p className="text-muted-foreground mb-4">
                    Main orchestrator function that coordinates subscription creation:
                  </p>
                  
                  <div className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-2">Step 1: Find or Create Subscriber</h4>
                      <div className="bg-slate-900 p-3 rounded overflow-x-auto mt-2">
                        <pre className="text-xs text-slate-100"><code>{`const { data: existingSubscriber } = await supabase
  .from('subscribers')
  .select('id')
  .eq('email', formData.email.trim().toLowerCase())
  .maybeSingle();`}</code></pre>
                      </div>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-2">Step 2: Create Subscription</h4>
                      <div className="bg-slate-900 p-3 rounded overflow-x-auto mt-2">
                        <pre className="text-xs text-slate-100"><code>{`const { data: subscription } = await supabase
  .from('subscriptions')
  .insert([{
    subscriber_id: subscriberId,
    location: formData.location, // 'saint-barthelemy' | 'saint-martin' | 'sint-maarten' | 'other'
    accommodation_name: formData.accommodationName,
    created_by_email: staffEmail,
  }])
  .select()
  .single();`}</code></pre>
                      </div>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-2">Step 3: Create Subscription Version with Addons</h4>
                      <div className="bg-slate-900 p-3 rounded overflow-x-auto mt-2">
                        <pre className="text-xs text-slate-100"><code>{`// Insert version
const { data: version } = await supabase
  .from('subscription_versions')
  .insert([{
    subscription_id: subscription.id,
    version_number: 1,
    plan_id: formData.planId,
    monthly_base_price: planPrice,
    additional_screens: formData.additionalScreens,
    duration_months: 12,
    currency: 'EUR',
    // ... pricing fields
  }])
  .select()
  .single();

// Insert addons to subscription_version_addons table
if (formData.addons.length > 0) {
  await supabase.from('subscription_version_addons').insert(
    formData.addons.map(addon => ({
      version_id: version.id,
      addon_id: addon.id,
      addon_name: addon.name,
      monthly_price: addon.price,
    }))
  );
}`}</code></pre>
                      </div>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-2">Steps 4-6: Related Records</h4>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Insert manager records → <code className="bg-muted px-1 rounded">managers</code> table</li>
                        <li>Insert financial manager records → <code className="bg-muted px-1 rounded">financial_managers</code> table</li>
                        <li>Insert delivery address → <code className="bg-muted px-1 rounded">delivery_addresses</code> table</li>
                        <li>Create contract record → <code className="bg-muted px-1 rounded">contracts</code> table</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Helper Functions</h3>
                  <div className="space-y-2">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p><strong className="text-foreground">calculateScreenPrice():</strong> <span className="text-muted-foreground">Location-based pricing for additional screens</span></p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p><strong className="text-foreground">calculateEndDate():</strong> <span className="text-muted-foreground">Calculates contract end date from start + duration</span></p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p><strong className="text-foreground">calculateDecoderRentalCost():</strong> <span className="text-muted-foreground">Location-based decoder rental pricing</span></p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p><strong className="text-foreground">updateContractStatus():</strong> <span className="text-muted-foreground">Updates contract to signed/rejected status</span></p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. Edge Function - signnow-contract (Direct Signer)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Purpose</h3>
                  <p className="text-muted-foreground">
                    Server-side function for the direct signer flow. Generates a contract from a location-specific 
                    template, optionally merges legal package and SEPA mandate, and sends directly to the signer.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Key Features</h3>
                  <div className="space-y-2">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p><strong className="text-foreground">Location-specific templates:</strong> <span className="text-muted-foreground">Uses SIGNNOW_TEMPLATE_ID_[LOCATION] env vars</span></p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p><strong className="text-foreground">Legal Package merging:</strong> <span className="text-muted-foreground">Merges T&C based on location + contract type (Individual/Professional)</span></p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p><strong className="text-foreground">SEPA Mandate:</strong> <span className="text-muted-foreground">Optional SEPA document merge with prefilled bank details</span></p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p><strong className="text-foreground">Location branding:</strong> <span className="text-muted-foreground">French brand for SBH/SXM, default brand for others</span></p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p><strong className="text-foreground">Debug mode:</strong> <span className="text-muted-foreground">API debugging for staff users with debugConfig parameter</span></p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Request Flow</h3>
                  <div className="space-y-3">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-2">1. Authentication</h4>
                      <div className="bg-slate-900 p-3 rounded overflow-x-auto mt-2">
                        <pre className="text-xs text-slate-100"><code>{`const tokenResponse = await fetch(\`\${apiBase}/oauth2/token\`, {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization: \`Basic \${btoa(\`\${clientId}:\${clientSecret}\`)}\`,
  },
  body: new URLSearchParams({
    grant_type: "password",
    username: userEmail,
    password: userPassword,
  }),
});`}</code></pre>
                      </div>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-2">2. Get Location-Specific Template</h4>
                      <div className="bg-slate-900 p-3 rounded overflow-x-auto mt-2">
                        <pre className="text-xs text-slate-100"><code>{`function getTemplateIdForLocation(locationId: string): string | null {
  // Try location-specific: SIGNNOW_TEMPLATE_ID_SAINT_BARTHELEMY
  const envKey = \`SIGNNOW_TEMPLATE_ID_\${locationId.toUpperCase().replace(/-/g, "_")}\`;
  const templateId = Deno.env.get(envKey);
  
  // Fallback to default: SIGNNOW_TEMPLATE_ID
  return templateId || Deno.env.get("SIGNNOW_TEMPLATE_ID");
}`}</code></pre>
                      </div>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-2">3. Prefill Smart Fields</h4>
                      <p className="text-muted-foreground text-sm mb-2">Prefills 50+ fields including subscriber info, costs, plan details:</p>
                      <div className="bg-slate-900 p-3 rounded overflow-x-auto mt-2">
                        <pre className="text-xs text-slate-100"><code>{`// Field naming convention:
// Proprio_*  - Owner/Subscriber fields
// Mgr_*      - Manager fields  
// Fin_*      - Financial manager fields
// Livraison_* - Delivery address fields
// Cost_*     - Calculated costs
// Tot_*      - Totals

const smartFieldsData = [
  { field_name: "Proprio_Nom", prefilled_text: subscriberName },
  { field_name: "Cost_MyPlan", prefilled_text: costs.Cost_MyPlan },
  { field_name: "Tot_Mensuel", prefilled_text: costs.Tot_Mensuel },
  // ... many more fields
];`}</code></pre>
                      </div>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-2">4. Legal Package Merge</h4>
                      <div className="bg-slate-900 p-3 rounded overflow-x-auto mt-2">
                        <pre className="text-xs text-slate-100"><code>{`function getLegalTemplateId(locationId: string, contractType: string): string | null {
  // SIGNNOW_LEGAL_TEMPLATE_SAINT_BARTHELEMY_INDIVIDUAL
  // SIGNNOW_LEGAL_TEMPLATE_SAINT_MARTIN_PROFESSIONAL
  const envKey = \`SIGNNOW_LEGAL_TEMPLATE_\${location}_\${contractType}\`;
  return Deno.env.get(envKey);
}

// Merge legal document with main contract
await fetch(\`\${apiBase}/document/\${documentId}/merge\`, {
  method: "POST",
  body: JSON.stringify({ document_ids: [legalTemplateId] }),
});`}</code></pre>
                      </div>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-2">5. SEPA Mandate Merge</h4>
                      <p className="text-muted-foreground text-sm">
                        If addSepaMandate is true, merges SEPA template and prefills bank details (IBAN, BIC, RUM).
                        Uses SIGNNOW_SEPA_TEMPLATE_ID or SIGNNOW_SEPA_SFG_TEMPLATE_ID for Saint-Martin.
                      </p>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-2">6. Assign Location Brand</h4>
                      <div className="bg-slate-900 p-3 rounded overflow-x-auto mt-2">
                        <pre className="text-xs text-slate-100"><code>{`function getBrandIdForLocation(locationId: string): string | null {
  // French locations use French brand
  if (locationId === "saint-barthelemy" || locationId === "saint-martin") {
    return Deno.env.get("SIGNNOW_BRAND_ID_FR");
  }
  // Default brand for Sint-Maarten and other locations
  return Deno.env.get("SIGNNOW_BRAND_ID");
}`}</code></pre>
                      </div>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-2">7. Generate Signing Link</h4>
                      <p className="text-muted-foreground text-sm">
                        Creates embedded signing session based on sendMethod (embed/email/sms).
                        Returns signing link for display or sends via chosen method.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Edge Function - signnow-essentials (Approver Flow)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Purpose</h3>
                  <p className="text-muted-foreground">
                    Server-side function for the 2-step approver workflow. Uses pre-filled templates with embedded 
                    legal package (Terms & Conditions). Approver signs first via embedded iframe, then signer 
                    receives email automatically.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Key Differences from Direct Flow</h3>
                  <div className="space-y-2">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p><strong className="text-foreground">Pre-filled templates:</strong> <span className="text-muted-foreground">Uses SIGNNOW_APPROVER_TEMPLATE_[LOCATION]_WITH_TC or _WITHOUT_TC</span></p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p><strong className="text-foreground">Embedded T&C:</strong> <span className="text-muted-foreground">Legal package is already merged in template (no runtime merge needed)</span></p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p><strong className="text-foreground">2-step routing:</strong> <span className="text-muted-foreground">Approver (order: 1) → Signer (order: 2) with automatic email routing</span></p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p><strong className="text-foreground">Embedded invite:</strong> <span className="text-muted-foreground">Returns embedded signing link for approver to sign in iframe</span></p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Template Selection</h3>
                  <div className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
                    <pre className="text-sm text-slate-100"><code>{`function getApproverTemplateId(locationId: string, includeLegalPackage: boolean): string {
  const suffix = includeLegalPackage ? "_WITH_TC" : "_WITHOUT_TC";
  // Examples:
  // SIGNNOW_APPROVER_TEMPLATE_SAINT_BARTHELEMY_WITH_TC
  // SIGNNOW_APPROVER_TEMPLATE_SINT_MAARTEN_WITHOUT_TC
  const envKey = \`SIGNNOW_APPROVER_TEMPLATE_\${location}\${suffix}\`;
  return Deno.env.get(envKey);
}`}</code></pre>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Routing Setup</h3>
                  <div className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
                    <pre className="text-sm text-slate-100"><code>{`// 2-step routing: Approver signs first, then signer receives email
const routingData = {
  to: [
    {
      email: approverEmail,     // Staff approver
      role: "Approver",
      order: 1,                  // Signs first
    },
    {
      email: signerEmail,       // Subscriber
      role: "Signer",
      order: 2,                  // Signs second (auto-routed after approver)
    }
  ],
  cc: [Deno.env.get("SIGNNOW_CC_EMAIL")], // CC on all contracts
};`}</code></pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5. Database Schema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Core Tables</h3>
                  <div className="space-y-3">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="font-semibold text-foreground">subscribers</p>
                      <p className="text-sm text-muted-foreground">Subscriber personal info: name, email, phone, address, company, accepts_marketing</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="font-semibold text-foreground">subscriptions</p>
                      <p className="text-sm text-muted-foreground">Main subscription: subscriber_id, location (enum), accommodation_name, current_version_id</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="font-semibold text-foreground">subscription_versions</p>
                      <p className="text-sm text-muted-foreground">Version history: plan_id, pricing fields, duration, screens, custom items, status</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="font-semibold text-foreground">subscription_version_addons</p>
                      <p className="text-sm text-muted-foreground">Add-on packages per version: addon_id, addon_name, monthly_price</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="font-semibold text-foreground">managers</p>
                      <p className="text-sm text-muted-foreground">Manager contact: name, email, phone, company, address</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="font-semibold text-foreground">financial_managers</p>
                      <p className="text-sm text-muted-foreground">Financial contact: name, email, phones</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="font-semibold text-foreground">delivery_addresses</p>
                      <p className="text-sm text-muted-foreground">Delivery info: address, city, postal_code, cell_phone</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="font-semibold text-foreground">contracts</p>
                      <p className="text-sm text-muted-foreground">Contract tracking: status (pending/signed/rejected), signnow_document_id, signnow_link, signature_method</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Staff & Auth Tables</h3>
                  <div className="space-y-3">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="font-semibold text-foreground">staff_users</p>
                      <p className="text-sm text-muted-foreground">Staff account info: email, full_name (created via auth trigger)</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="font-semibold text-foreground">staff_profiles</p>
                      <p className="text-sm text-muted-foreground">Links auth.users to staff_users: id (auth.users FK), staff_user_id</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="font-semibold text-foreground">user_roles</p>
                      <p className="text-sm text-muted-foreground">Role management: user_id, role (admin/staff/viewer) - used for RLS policies</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Enums</h3>
                  <div className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
                    <pre className="text-sm text-slate-100"><code>{`-- Location types
location_type: 'saint-barthelemy' | 'saint-martin' | 'sint-maarten' | 'other'

-- Contract status
contract_status: 'pending' | 'signed' | 'rejected'

-- Contract type (in-person vs remote)
contract_type: 'in_person' | 'remote'

-- App roles for RLS
app_role: 'admin' | 'staff' | 'viewer'

-- Subscription status
subscription_status: 'active' | 'suspended' | 'cancelled'`}</code></pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>6. Environment Variables (Secrets)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Core SignNow Credentials</h3>
                  <div className="space-y-2">
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-sm text-slate-100 font-mono">SIGNNOW_API_BASE_URL</p>
                      <p className="text-xs text-slate-400 mt-1">SignNow API base URL (api.signnow.com)</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-sm text-slate-100 font-mono">SIGNNOW_CLIENT_ID</p>
                      <p className="text-xs text-slate-400 mt-1">OAuth client ID</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-sm text-slate-100 font-mono">SIGNNOW_CLIENT_SECRET</p>
                      <p className="text-xs text-slate-400 mt-1">OAuth client secret</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-sm text-slate-100 font-mono">SIGNNOW_USER_EMAIL</p>
                      <p className="text-xs text-slate-400 mt-1">SignNow account email</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-sm text-slate-100 font-mono">SIGNNOW_USER_PASSWORD</p>
                      <p className="text-xs text-slate-400 mt-1">SignNow account password</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-sm text-slate-100 font-mono">SIGNNOW_CC_EMAIL</p>
                      <p className="text-xs text-slate-400 mt-1">CC email for all contracts</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Contract Templates by Location</h3>
                  <div className="space-y-2">
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-sm text-slate-100 font-mono">SIGNNOW_TEMPLATE_ID_SAINT_BARTHELEMY</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-sm text-slate-100 font-mono">SIGNNOW_TEMPLATE_ID_SAINT_MARTIN</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-sm text-slate-100 font-mono">SIGNNOW_TEMPLATE_ID_SINT_MAARTEN</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-sm text-slate-100 font-mono">SIGNNOW_TEMPLATE_ID_OTHER</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-sm text-slate-100 font-mono">SIGNNOW_TEMPLATE_ID</p>
                      <p className="text-xs text-slate-400 mt-1">Fallback default template</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Approver Templates (8 total)</h3>
                  <p className="text-sm text-muted-foreground mb-2">Pre-filled templates for approver flow with/without T&C:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-xs text-slate-100 font-mono">SIGNNOW_APPROVER_TEMPLATE_SAINT_BARTHELEMY_WITH_TC</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-xs text-slate-100 font-mono">SIGNNOW_APPROVER_TEMPLATE_SAINT_BARTHELEMY_WITHOUT_TC</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-xs text-slate-100 font-mono">SIGNNOW_APPROVER_TEMPLATE_SAINT_MARTIN_WITH_TC</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-xs text-slate-100 font-mono">SIGNNOW_APPROVER_TEMPLATE_SAINT_MARTIN_WITHOUT_TC</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-xs text-slate-100 font-mono">SIGNNOW_APPROVER_TEMPLATE_SINT_MAARTEN_WITH_TC</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-xs text-slate-100 font-mono">SIGNNOW_APPROVER_TEMPLATE_SINT_MAARTEN_WITHOUT_TC</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-xs text-slate-100 font-mono">SIGNNOW_APPROVER_TEMPLATE_OTHER_WITH_TC</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-xs text-slate-100 font-mono">SIGNNOW_APPROVER_TEMPLATE_OTHER_WITHOUT_TC</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Legal Package Templates (6 total)</h3>
                  <p className="text-sm text-muted-foreground mb-2">T&C by location and contract type (Individual/Professional):</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-xs text-slate-100 font-mono">SIGNNOW_LEGAL_TEMPLATE_SAINT_BARTHELEMY_INDIVIDUAL</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-xs text-slate-100 font-mono">SIGNNOW_LEGAL_TEMPLATE_SAINT_BARTHELEMY_PROFESSIONAL</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-xs text-slate-100 font-mono">SIGNNOW_LEGAL_TEMPLATE_SAINT_MARTIN_INDIVIDUAL</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-xs text-slate-100 font-mono">SIGNNOW_LEGAL_TEMPLATE_SAINT_MARTIN_PROFESSIONAL</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-xs text-slate-100 font-mono">SIGNNOW_LEGAL_TEMPLATE_SINT_MAARTEN_INDIVIDUAL</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-xs text-slate-100 font-mono">SIGNNOW_LEGAL_TEMPLATE_SINT_MAARTEN_PROFESSIONAL</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">SEPA & Branding</h3>
                  <div className="space-y-2">
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-sm text-slate-100 font-mono">SIGNNOW_SEPA_TEMPLATE_ID</p>
                      <p className="text-xs text-slate-400 mt-1">Default SEPA mandate template</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-sm text-slate-100 font-mono">SIGNNOW_SEPA_SFG_TEMPLATE_ID</p>
                      <p className="text-xs text-slate-400 mt-1">Saint-Martin specific SEPA template</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-sm text-slate-100 font-mono">SIGNNOW_BRAND_ID</p>
                      <p className="text-xs text-slate-400 mt-1">Default brand (Dutch/Sint-Maarten)</p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg">
                      <p className="text-sm text-slate-100 font-mono">SIGNNOW_BRAND_ID_FR</p>
                      <p className="text-xs text-slate-400 mt-1">French brand (Saint-Barthélemy/Saint-Martin)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>7. API Debug Mode</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Purpose</h3>
                  <p className="text-muted-foreground">
                    Debug mode allows staff users to intercept SignNow API calls and modify responses 
                    for testing purposes. Useful for debugging field mapping issues.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Usage</h3>
                  <div className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
                    <pre className="text-sm text-slate-100"><code>{`// Request payload with debug config
{
  // ... normal contract data ...
  debugConfig: {
    enabled: true,
    endpoint: "assignBrandToDocument",    // API endpoint to intercept
    attributePath: "brand_id",            // Field to modify
    newValue: "test-brand-123"            // New test value
  },
  staffUserId: "user-uuid"  // Required for authorization
}

// Response includes debug data
{
  success: true,
  documentId: "...",
  signingLink: "...",
  debugData: {
    endpoint: "assignBrandToDocument",
    attributePath: "brand_id",
    original: { ... },     // Original API response
    modified: { ... },     // Modified response
    success: true
  }
}`}</code></pre>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Authorization</h3>
                  <p className="text-muted-foreground">
                    Debug mode requires staffUserId parameter. The function verifies the user has 
                    'admin' or 'staff' role via the user_roles table before enabling debug features.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>8. Error Handling</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg">
                    <h4 className="font-semibold text-foreground mb-2">Authentication Failures</h4>
                    <p className="text-sm text-muted-foreground">
                      SignNow OAuth failures return 500 with details. UI displays error via toast.
                    </p>
                  </div>
                  <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg">
                    <h4 className="font-semibold text-foreground mb-2">Template Not Found</h4>
                    <p className="text-sm text-muted-foreground">
                      Missing template for location throws error with specific env var name needed.
                    </p>
                  </div>
                  <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg">
                    <h4 className="font-semibold text-foreground mb-2">Database Errors</h4>
                    <p className="text-sm text-muted-foreground">
                      Subscription creation failures logged with details. UI shows toast notification.
                    </p>
                  </div>
                  <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg">
                    <h4 className="font-semibold text-foreground mb-2">SignNow API Errors</h4>
                    <p className="text-sm text-muted-foreground">
                      Each API call wrapped in try-catch. Errors include step name and response details.
                    </p>
                  </div>
                  <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg">
                    <h4 className="font-semibold text-foreground mb-2">Missing Staff Profile</h4>
                    <p className="text-sm text-muted-foreground">
                      Users without staff_profile cannot create subscriptions. Error shown before any DB ops.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>9. Success Flows</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-primary/10 border border-primary/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">Summary Only Method</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Creates all subscription records in database</li>
                    <li>Navigates to /contract-summary page</li>
                    <li>Displays subscription details for review</li>
                    <li>No SignNow integration involved</li>
                  </ol>
                </div>
                <div className="bg-primary/10 border border-primary/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">Direct Signer Method (Secure Remote)</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Creates all subscription records in database</li>
                    <li>Navigates to /contract-secure page</li>
                    <li>Calls signnow-contract edge function</li>
                    <li>Generates contract with optional legal package & SEPA</li>
                    <li>Sends to signer via embed/email/SMS</li>
                    <li>Updates contract record with SignNow IDs</li>
                    <li>Displays success with signing link</li>
                  </ol>
                </div>
                <div className="bg-primary/10 border border-primary/30 p-4 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">Approver Flow Method</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Creates all subscription records in database</li>
                    <li>Navigates to /contract-approver page</li>
                    <li>Calls signnow-essentials edge function</li>
                    <li>Generates contract from pre-filled template</li>
                    <li>Returns embedded signing link for approver</li>
                    <li>Approver signs in embedded iframe</li>
                    <li>SignNow automatically emails signer</li>
                    <li>Displays success confirmation</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>10. Integration Points</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-foreground mb-2">SignNow API v2</h4>
                    <p className="text-sm text-muted-foreground">
                      REST API for document management, template prefilling, document merging, 
                      routing, branding, and embedded signing sessions
                    </p>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-foreground mb-2">Supabase Database</h4>
                    <p className="text-sm text-muted-foreground">
                      PostgreSQL with RLS policies. All tables use has_role() function for access control.
                    </p>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-foreground mb-2">Supabase Edge Functions</h4>
                    <p className="text-sm text-muted-foreground">
                      Deno-based serverless functions: signnow-contract, signnow-essentials, update-signnow-brand
                    </p>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-foreground mb-2">React Router</h4>
                    <p className="text-sm text-muted-foreground">
                      Client-side routing with state management via location state and URL params
                    </p>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-foreground mb-2">i18next</h4>
                    <p className="text-sm text-muted-foreground">
                      Multi-language support (EN, FR, ES) for UI text and form labels
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>11. Future Enhancements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm text-foreground">
                    • Add SignNow webhook handler for contract status updates (auto-update contract status)
                  </p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm text-foreground">
                    • Implement contract reminder system for unsigned contracts
                  </p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm text-foreground">
                    • Add dashboard for tracking pending contracts with filters
                  </p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm text-foreground">
                    • Contract template versioning and A/B testing
                  </p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm text-foreground">
                    • Add audit logging for all contract operations
                  </p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm text-foreground">
                    • Bulk contract sending for multiple subscribers
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 p-6 bg-muted/50 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground text-center">
              <strong className="text-foreground">Documentation Updated:</strong> {new Date().toLocaleDateString()} | 
              <strong className="text-foreground ml-4">Version:</strong> 2.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
