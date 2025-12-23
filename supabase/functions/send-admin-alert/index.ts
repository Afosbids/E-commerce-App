import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminAlertRequest {
  alertType: 'role_change' | '2fa_enabled' | '2fa_disabled' | 'user_deleted' | 'bulk_action' | 'security_event';
  actorEmail: string;
  actorName?: string;
  targetEmail?: string;
  targetName?: string;
  details: string;
  severity?: 'info' | 'warning' | 'critical';
}

const getAlertSubject = (alertType: string, severity: string): string => {
  const severityPrefix = severity === 'critical' ? '🚨 CRITICAL: ' : 
                         severity === 'warning' ? '⚠️ Warning: ' : 'ℹ️ ';
  
  switch (alertType) {
    case 'role_change':
      return `${severityPrefix}User Role Changed - ShopPro Admin`;
    case '2fa_enabled':
      return `${severityPrefix}2FA Enabled - ShopPro Admin`;
    case '2fa_disabled':
      return `${severityPrefix}2FA Disabled - ShopPro Admin`;
    case 'user_deleted':
      return `${severityPrefix}User Deleted - ShopPro Admin`;
    case 'bulk_action':
      return `${severityPrefix}Bulk Action Performed - ShopPro Admin`;
    case 'security_event':
      return `${severityPrefix}Security Event - ShopPro Admin`;
    default:
      return `${severityPrefix}Admin Action - ShopPro Admin`;
  }
};

const getAlertColor = (severity: string): string => {
  switch (severity) {
    case 'critical': return '#dc2626';
    case 'warning': return '#f59e0b';
    default: return '#3b82f6';
  }
};

const generateEmailHtml = (data: AdminAlertRequest): string => {
  const severity = data.severity || 'info';
  const color = getAlertColor(severity);
  const timestamp = new Date().toLocaleString('en-US', { 
    timeZone: 'UTC', 
    dateStyle: 'full', 
    timeStyle: 'long' 
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${color}; padding: 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                🛡️ ShopPro Admin Alert
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 20px;">
                ${getAlertSubject(data.alertType, severity).replace(/^[^\s]+ /, '')}
              </h2>
              
              <div style="background-color: #f4f4f5; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #3f3f46; margin: 0 0 8px 0; font-size: 14px;">
                  <strong>Performed by:</strong> ${data.actorName || data.actorEmail}
                </p>
                ${data.targetEmail ? `
                <p style="color: #3f3f46; margin: 0 0 8px 0; font-size: 14px;">
                  <strong>Target user:</strong> ${data.targetName || data.targetEmail}
                </p>
                ` : ''}
                <p style="color: #3f3f46; margin: 0; font-size: 14px;">
                  <strong>Time:</strong> ${timestamp} (UTC)
                </p>
              </div>
              
              <div style="border-left: 4px solid ${color}; padding-left: 16px; margin-bottom: 24px;">
                <h3 style="color: #18181b; margin: 0 0 8px 0; font-size: 16px;">Details</h3>
                <p style="color: #52525b; margin: 0; font-size: 14px; line-height: 1.6;">
                  ${data.details}
                </p>
              </div>
              
              <p style="color: #71717a; font-size: 12px; margin: 0;">
                This is an automated security notification from ShopPro. If you did not perform this action, please review your admin access immediately.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f4f4f5; padding: 16px; text-align: center;">
              <p style="color: #71717a; font-size: 12px; margin: 0;">
                ShopPro Admin • Security Monitoring System
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    // Verify the request is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the user is an admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const alertData: AdminAlertRequest = await req.json();
    
    // Get all admin emails to notify
    const { data: admins, error: adminsError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminsError) {
      console.error("Error fetching admins:", adminsError);
      throw new Error("Failed to fetch admin list");
    }

    // Get admin emails from profiles
    const adminUserIds = admins?.map(a => a.user_id) || [];
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("email, user_id")
      .in("user_id", adminUserIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
    }

    const adminEmails = profiles?.map(p => p.email).filter(Boolean) || [];
    
    // If no admin emails found, log and return success (don't fail the action)
    if (adminEmails.length === 0) {
      console.log("No admin emails found to notify");
      return new Response(
        JSON.stringify({ success: true, message: "No admin emails configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending admin alert to ${adminEmails.length} admin(s):`, alertData.alertType);

    // Send emails to all admins
    const emailHtml = generateEmailHtml(alertData);
    const subject = getAlertSubject(alertData.alertType, alertData.severity || 'info');

    const emailResponse = await resend.emails.send({
      from: "ShopPro Admin <onboarding@resend.dev>",
      to: adminEmails,
      subject: subject,
      html: emailHtml,
    });

    console.log("Admin alert email sent:", emailResponse);

    // Log the alert to audit_logs
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "ADMIN_ALERT_SENT",
      table_name: "admin_alerts",
      new_values: {
        alert_type: alertData.alertType,
        severity: alertData.severity,
        recipients: adminEmails.length,
        details: alertData.details
      }
    });

    return new Response(
      JSON.stringify({ success: true, recipients: adminEmails.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-admin-alert:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send alert" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
