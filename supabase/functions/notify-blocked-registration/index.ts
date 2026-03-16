import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName } = await req.json();
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Email not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminEmails = ['admin@industours.pk', 'mohidmughalk@gmail.com'];

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Indus Tours <alerts@industours.pk>',
        to: adminEmails,
        subject: '⚠️ Blocked Registration Attempt',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #1a1a2e; border-radius: 12px; padding: 30px; color: #fff;">
              <h2 style="color: #d4a44a; margin: 0 0 20px;">🚫 Registration Attempt Blocked</h2>
              <p style="color: #ccc; margin: 0 0 15px;">Someone tried to register while registration is <strong style="color: #ef4444;">disabled</strong>.</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #999; width: 120px;">Email:</td>
                  <td style="padding: 8px 0; color: #fff; font-weight: bold;">${email || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #999;">Name:</td>
                  <td style="padding: 8px 0; color: #fff; font-weight: bold;">${fullName || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #999;">Time:</td>
                  <td style="padding: 8px 0; color: #fff;">${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}</td>
                </tr>
              </table>
              <hr style="border: none; border-top: 1px solid #333; margin: 20px 0;" />
              <p style="color: #888; font-size: 12px; margin: 0;">This is an automated alert from Indus Tours God Mode.</p>
            </div>
          </div>
        `,
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
