import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailInviteConfig {
  subject: string;
  body_header: string;
  body_message: string;
  footer_message: string;
  from: string;
  expiration: string;
}

interface UpdateBrandRequest {
  brandId: string;
  resourceType: 'email-invite';
  attributePath?: string;
  newValue?: string;
  staffUserId?: string;
  fullPayload?: {
    fr: EmailInviteConfig;
    en: EmailInviteConfig;
  };
}

interface UpdateBrandResponse {
  success: boolean;
  message: string;
  brandId: string;
  originalConfig?: any;
  updatedConfig?: any;
  changedFields?: string[];
  error?: string;
}

// Utility to get nested property
function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Utility to set nested property (immutable)
function setNestedProperty(obj: any, path: string, value: any): any {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  
  const newObj = JSON.parse(JSON.stringify(obj));
  let current = newObj;
  
  for (const key of keys) {
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[lastKey] = value;
  return newObj;
}

// Get changed fields between two objects
function getChangedFields(original: any, updated: any, prefix = ''): string[] {
  const changes: string[] = [];
  
  for (const key in updated) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    
    if (typeof updated[key] === 'object' && updated[key] !== null && !Array.isArray(updated[key])) {
      changes.push(...getChangedFields(original[key] || {}, updated[key], fullPath));
    } else if (JSON.stringify(original[key]) !== JSON.stringify(updated[key])) {
      changes.push(fullPath);
    }
  }
  
  return changes;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: UpdateBrandRequest = await req.json();
    const { brandId, resourceType, attributePath, newValue, staffUserId, fullPayload } = requestData;

    console.log('Update brand request:', { brandId, resourceType, attributePath, hasFullPayload: !!fullPayload });

    // Validate request
    if (!brandId || !resourceType) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: brandId and resourceType' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!attributePath && !fullPayload) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Either attributePath with newValue or fullPayload must be provided' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authorization check - verify staff/admin role
    if (staffUserId) {
      const { data: hasStaffRole } = await supabase.rpc('has_role', {
        _user_id: staffUserId,
        _role: 'staff'
      });

      const { data: hasAdminRole } = await supabase.rpc('has_role', {
        _user_id: staffUserId,
        _role: 'admin'
      });

      if (!hasStaffRole && !hasAdminRole) {
        console.error('Unauthorized: User does not have staff or admin role');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Unauthorized: Staff or admin role required' 
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get SignNow credentials
    const clientId = Deno.env.get('SIGNNOW_CLIENT_ID');
    const clientSecret = Deno.env.get('SIGNNOW_CLIENT_SECRET');
    const userEmail = Deno.env.get('SIGNNOW_USER_EMAIL');
    const userPassword = Deno.env.get('SIGNNOW_USER_PASSWORD');
    const apiBaseUrl = Deno.env.get('SIGNNOW_API_BASE_URL') || 'https://api.signnow.com';

    if (!clientId || !clientSecret || !userEmail || !userPassword) {
      throw new Error('Missing SignNow credentials');
    }

    // Authenticate with SignNow
    console.log('Authenticating with SignNow...');
    const authResponse = await fetch(`${apiBaseUrl}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        username: userEmail,
        password: userPassword,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('SignNow authentication failed:', errorText);
      throw new Error(`SignNow authentication failed: ${authResponse.status}`);
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Get current brand resources
    console.log(`Fetching current ${resourceType} configuration...`);
    const getResourceUrl = `${apiBaseUrl}/api/v2/brands/${brandId}/resources/${resourceType}`;
    const getResponse = await fetch(getResourceUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      console.error('Failed to fetch brand resources:', errorText);
      throw new Error(`Failed to fetch brand resources: ${getResponse.status}`);
    }

    const originalConfig = await getResponse.json();
    console.log('Current configuration retrieved');

    // Prepare updated configuration
    let updatedConfig;
    if (fullPayload) {
      // Full payload update mode
      updatedConfig = fullPayload;
      console.log('Using full payload update mode');
    } else if (attributePath && newValue !== undefined) {
      // Attribute path update mode
      updatedConfig = setNestedProperty(originalConfig, attributePath, newValue);
      console.log(`Updated attribute: ${attributePath} = ${newValue}`);
    }

    // Identify changed fields
    const changedFields = getChangedFields(originalConfig, updatedConfig);
    console.log('Changed fields:', changedFields);

    // Update brand resources
    console.log(`Updating ${resourceType} configuration...`);
    const putResourceUrl = `${apiBaseUrl}/api/v2/brands/${brandId}/resources/${resourceType}`;
    const putResponse = await fetch(putResourceUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedConfig),
    });

    if (!putResponse.ok) {
      const errorText = await putResponse.text();
      console.error('Failed to update brand resources:', errorText);
      throw new Error(`Failed to update brand resources: ${putResponse.status} - ${errorText}`);
    }

    console.log('Brand resources updated successfully');

    const response: UpdateBrandResponse = {
      success: true,
      message: 'Brand resources updated successfully',
      brandId,
      originalConfig,
      updatedConfig,
      changedFields,
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in update-signnow-brand:', error);
    
    const errorResponse: UpdateBrandResponse = {
      success: false,
      message: 'Failed to update brand resources',
      brandId: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return new Response(
      JSON.stringify(errorResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
