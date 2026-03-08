import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const db = createClient(supabaseUrl, serviceRoleKey);

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const status = url.searchParams.get("status");
    const userId = url.searchParams.get("user_id");
    const includeDeleted = url.searchParams.get("include_deleted") === "true";

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: role } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const isAdmin = !!role;

    const logActivity = async (action: string, entityId?: string, details?: Record<string, unknown>) => {
      await db.from("activity_logs").insert({
        user_id: user.id,
        ip_address: ipAddress,
        user_agent: userAgent,
        action,
        entity_type: "booking",
        entity_id: entityId,
        details,
      });
    };

    // Safe JSON body parser - returns empty object if no body
    const safeParseBody = async (): Promise<Record<string, unknown>> => {
      try {
        const text = await req.text();
        if (!text || text.trim() === "") return {};
        return JSON.parse(text);
      } catch {
        return {};
      }
    };

    if (req.method === "GET") {
      let query = db.from("bookings").select("*, tours(title, image_url), deals(title, discount_percent, code)");
      
      if (!includeDeleted) {
        query = query.or("is_deleted.is.null,is_deleted.eq.false");
      }
      
      if (id) {
        query = query.eq("id", id);
      }
      if (status) {
        query = query.eq("status", status);
      }
      
      if (!isAdmin) {
        query = query.eq("user_id", user.id);
      } else if (userId) {
        query = query.eq("user_id", userId);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ data }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (req.method === "PUT") {
      const body = await safeParseBody();
      
      // Handle bulk update
      if (body.bulk && body.ids) {
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: "Admin access required" }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const { ids, bulk, ...updates } = body;
        const { data, error } = await db
          .from("bookings")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .in("id", ids as string[])
          .select();

        if (error) throw error;

        await logActivity("bulk_update", undefined, { ids, updates });

        return new Response(JSON.stringify({ data }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Handle restore
      if (body.restore && body.id) {
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: "Admin access required" }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const { data, error } = await db
          .from("bookings")
          .update({ is_deleted: false, deleted_at: null, deleted_by: null, updated_at: new Date().toISOString() })
          .eq("id", body.id as string)
          .select()
          .single();

        if (error) throw error;

        await logActivity("restore", body.id as string, { restored: true });

        return new Response(JSON.stringify({ data }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const { id: bookingId, ...updates } = body;

      if (!isAdmin) {
        const { data: booking } = await db
          .from("bookings")
          .select("user_id, status")
          .eq("id", bookingId as string)
          .single();

        if (!booking || booking.user_id !== user.id) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        if (booking.status !== "pending") {
          return new Response(JSON.stringify({ error: "Can only modify pending bookings" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const allowedFields = ["travel_date", "status"];
        for (const key of Object.keys(updates)) {
          if (!allowedFields.includes(key)) {
            delete updates[key];
          }
        }
      }

      const { data, error } = await db
        .from("bookings")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", bookingId as string)
        .select()
        .single();

      if (error) throw error;

      await logActivity("update", bookingId as string, updates);

      return new Response(JSON.stringify({ data }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (req.method === "DELETE") {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Support both body and query param for ID
      const body = await safeParseBody();
      const deleteId = (body.id as string) || id;
      const bulkIds = body.ids as string[] | undefined;
      const isBulk = body.bulk as boolean | undefined;

      // Handle bulk delete (soft delete)
      if (isBulk && bulkIds) {
        const { error } = await db
          .from("bookings")
          .update({ 
            is_deleted: true, 
            deleted_at: new Date().toISOString(),
            deleted_by: user.id,
            updated_at: new Date().toISOString()
          })
          .in("id", bulkIds);

        if (error) throw error;

        await logActivity("bulk_delete", undefined, { ids: bulkIds });

        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Soft delete single booking
      if (!deleteId) {
        return new Response(JSON.stringify({ error: "Missing booking ID" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const { error } = await db
        .from("bookings")
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq("id", deleteId);

      if (error) throw error;

      await logActivity("delete", deleteId, { soft_deleted: true });

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (err) {
    console.error("api-bookings error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
