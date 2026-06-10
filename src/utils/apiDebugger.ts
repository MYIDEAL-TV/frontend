/**
 * API Debugger Utility
 * Fetches data from an endpoint, modifies specified attributes, and returns both versions
 */

export interface ApiDebugResult {
  original: any;
  modified: any;
  success: boolean;
  error?: string;
  endpoint: string;
  attributePath: string;
}

export interface FetchOptions {
  method?: 'GET';
  headers?: Record<string, string>;
  authToken?: string;
}

/**
 * Get a nested property value using dot notation
 * @example getNestedProperty({user: {name: 'John'}}, 'user.name') // 'John'
 */
export function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    // Handle array notation like "items[0]"
    const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayKey, index] = arrayMatch;
      return current?.[arrayKey]?.[parseInt(index)];
    }
    return current?.[key];
  }, obj);
}

/**
 * Set a nested property value using dot notation
 * @example setNestedProperty({user: {name: 'John'}}, 'user.name', 'Jane')
 */
export function setNestedProperty(obj: any, path: string, value: any): any {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  
  // Clone the object to avoid mutations
  const result = JSON.parse(JSON.stringify(obj));
  
  // Navigate to the parent of the target property
  let current = result;
  for (const key of keys) {
    // Handle array notation
    const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayKey, index] = arrayMatch;
      if (!current[arrayKey]) current[arrayKey] = [];
      current = current[arrayKey][parseInt(index)];
    } else {
      if (!current[key]) current[key] = {};
      current = current[key];
    }
  }
  
  // Set the final value
  const arrayMatch = lastKey.match(/^(\w+)\[(\d+)\]$/);
  if (arrayMatch) {
    const [, arrayKey, index] = arrayMatch;
    if (!current[arrayKey]) current[arrayKey] = [];
    current[arrayKey][parseInt(index)] = value;
  } else {
    current[lastKey] = value;
  }
  
  return result;
}

/**
 * Fetch data from an API endpoint, modify a specific attribute, and return both versions
 */
export async function fetchAndModifyAPI(
  endpoint: string,
  attributePath: string,
  newValue: any,
  options: FetchOptions = {}
): Promise<ApiDebugResult> {
  try {
    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (options.authToken) {
      headers['Authorization'] = `Bearer ${options.authToken}`;
    }

    // Fetch the data
    const response = await fetch(endpoint, {
      method: options.method || 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const originalData = await response.json();

    // Verify the attribute path exists
    const currentValue = getNestedProperty(originalData, attributePath);
    if (currentValue === undefined) {
      console.warn(`Attribute path "${attributePath}" not found in response. Creating it.`);
    }

    // Create modified version
    const modifiedData = setNestedProperty(originalData, attributePath, newValue);

    return {
      original: originalData,
      modified: modifiedData,
      success: true,
      endpoint,
      attributePath,
    };
  } catch (error) {
    return {
      original: null,
      modified: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      endpoint,
      attributePath,
    };
  }
}

/**
 * Format JSON with proper indentation
 */
export function formatJSON(data: any): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch (error) {
    return 'Unable to format JSON';
  }
}
