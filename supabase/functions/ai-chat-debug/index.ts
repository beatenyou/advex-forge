import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 DEBUG FUNCTION - Analyzing request...');
    
    // Log all request details
    const debugInfo = {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
      timestamp: new Date().toISOString()
    };
    
    console.log('📋 Request Debug Info:', JSON.stringify(debugInfo, null, 2));
    
    // Try multiple ways to read the body
    let bodyInfo = {
      hasBody: req.body !== null,
      contentLength: req.headers.get('content-length'),
      contentType: req.headers.get('content-type'),
      bodyReadMethods: {}
    };
    
    // Clone the request to try multiple reading methods
    const reqClone1 = req.clone();
    const reqClone2 = req.clone();
    
    // Method 1: Try to read as text
    try {
      const textBody = await reqClone1.text();
      bodyInfo.bodyReadMethods.text = {
        success: true,
        length: textBody.length,
        preview: textBody.substring(0, 200),
        isEmpty: !textBody || textBody.trim().length === 0
      };
    } catch (error) {
      bodyInfo.bodyReadMethods.text = {
        success: false,
        error: error.message
      };
    }
    
    // Method 2: Try to read as JSON directly
    try {
      const jsonBody = await reqClone2.json();
      bodyInfo.bodyReadMethods.json = {
        success: true,
        keys: Object.keys(jsonBody),
        data: jsonBody
      };
    } catch (error) {
      bodyInfo.bodyReadMethods.json = {
        success: false,
        error: error.message
      };
    }
    
    console.log('📦 Body Analysis:', JSON.stringify(bodyInfo, null, 2));
    
    // Return comprehensive diagnostic information
    return new Response(JSON.stringify({
      success: true,
      message: 'Debug function executed successfully',
      debugInfo,
      bodyInfo,
      recommendations: [
        'Check if edge function deployment is current',
        'Verify CORS configuration',
        'Confirm request body serialization',
        'Test with direct function invocation'
      ]
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('❌ Debug function error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});