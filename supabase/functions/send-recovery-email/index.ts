import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const userId = claimsData.claims.sub;

    // Check admin role
    const { data: roleData } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin only" }), { status: 403, headers: corsHeaders });
    }

    const { abandoned_booking_id } = await req.json();
    if (!abandoned_booking_id) {
      return new Response(JSON.stringify({ error: "abandoned_booking_id is required" }), { status: 400, headers: corsHeaders });
    }

    // Fetch the abandoned booking with tour info
    const { data: booking, error: fetchError } = await supabase
      .from("abandoned_bookings")
      .select("*, tours(title)")
      .eq("id", abandoned_booking_id)
      .single();

    if (fetchError || !booking) {
      return new Response(JSON.stringify({ error: "Abandoned booking not found" }), { status: 404, headers: corsHeaders });
    }

    const email = booking.email || booking.form_data?.customer_email;
    if (!email) {
      return new Response(JSON.stringify({ error: "No email address found for this abandoned booking" }), { status: 400, headers: corsHeaders });
    }

    const customerName = booking.form_data?.customer_name || "Valued Traveler";
    const tourName = booking.tours?.title || booking.form_data?.tour_name || "your selected tour";
    const travelDate = booking.form_data?.travel_date || "your chosen date";
    const numTravelers = booking.form_data?.num_travelers || "your group";
    const siteUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "").replace("https://", "") || "";
    const recoveryLink = `https://industourspakistan.lovable.app/booking`;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), { status: 500, headers: corsHeaders });
    }

    const resend = new Resend(resendApiKey);

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f7fa; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1a5c2e 0%, #2d8a4e 100%); padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
    .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px 24px; }
    .body h2 { color: #1a5c2e; margin-top: 0; }
    .details { background: #f0faf4; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #2d8a4e; }
    .details p { margin: 8px 0; color: #333; font-size: 14px; }
    .details strong { color: #1a5c2e; }
    .cta { text-align: center; margin: 28px 0; }
    .cta a { background: linear-gradient(135deg, #1a5c2e, #2d8a4e); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; }
    .discount { background: #fff3cd; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center; border: 1px solid #ffc107; }
    .discount p { margin: 0; color: #856404; font-weight: bold; }
    .footer { background: #f8f9fa; padding: 20px 24px; text-align: center; border-top: 1px solid #e9ecef; }
    .footer p { margin: 4px 0; color: #666; font-size: 12px; }
    .footer a { color: #1a5c2e; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏔️ Indus Tours Pakistan</h1>
      <p>Your Adventure Awaits!</p>
    </div>
    <div class="body">
      <h2>Dear ${customerName},</h2>
      <p>We noticed you started booking <strong>${tourName}</strong> but didn't complete it. Don't miss out on this incredible adventure!</p>
      
      <div class="details">
        <p><strong>📋 Your Booking Details:</strong></p>
        <p>🏔️ Tour: <strong>${tourName}</strong></p>
        <p>📅 Date: <strong>${travelDate}</strong></p>
        <p>👥 Travelers: <strong>${numTravelers}</strong></p>
      </div>

      <div class="discount">
        <p>🎁 Complete your booking now and get a special discount!</p>
      </div>

      <div class="cta">
        <a href="${recoveryLink}">Complete Your Booking →</a>
      </div>

      <p style="color: #666; font-size: 14px;">If you faced any issues or have questions, feel free to reach out to us:</p>
      <p style="color: #333; font-size: 14px;">📞 +92 311 8088007 &nbsp; | &nbsp; 💬 WhatsApp: +92 311 8088007</p>
    </div>
    <div class="footer">
      <p>Best regards, <strong>Shahzaib Khan Mughal</strong></p>
      <p>Founder, <a href="https://industourspakistan.lovable.app">Indus Tours Pakistan</a></p>
      <p style="margin-top: 12px; font-size: 10px; color: #999;">You received this email because you started a booking on our website.</p>
    </div>
  </div>
</body>
</html>`;

    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: "Indus Tours Pakistan <onboarding@resend.dev>",
      to: [email],
      subject: `You left something behind! Complete your ${tourName} booking 🏔️`,
      html: htmlContent,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return new Response(JSON.stringify({ error: "Failed to send email", details: emailError }), { status: 500, headers: corsHeaders });
    }

    // Mark recovery_sent = true
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    await serviceClient
      .from("abandoned_bookings")
      .update({ recovery_sent: true })
      .eq("id", abandoned_booking_id);

    return new Response(JSON.stringify({ data: { success: true, email_id: emailResult?.id, sent_to: email } }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
