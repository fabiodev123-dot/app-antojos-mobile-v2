import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-setup-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ResponseBody {
  success?: boolean;
  user_id?: string;
  email?: string;
  created?: boolean;
  already_admin?: boolean;
  error?: string;
  detail?: string;
}

function json(body: ResponseBody, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const expectedToken = Deno.env.get("SETUP_TOKEN");
  if (!expectedToken) {
    return json(
      { error: "SETUP_TOKEN env var not configured in edge function secrets" },
      500,
    );
  }
  const providedToken = req.headers.get("x-setup-token");
  if (!providedToken || providedToken !== expectedToken) {
    return json({ error: "Unauthorized: missing or invalid x-setup-token" }, 401);
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const email = body.email?.toLowerCase().trim();
  const password = body.password;

  if (!email || !password) {
    return json({ error: "Missing email or password" }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: `Invalid email: ${email}` }, 400);
  }
  if (password.length < 8) {
    return json({ error: "Password too short (min 8 chars)" }, 400);
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let userId: string;
  let created = false;

  const { data: listData, error: listError } =
    await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listError) {
    return json({ error: "listUsers failed", detail: listError.message }, 500);
  }
  const existing = listData?.users.find(
    (u) => u.email?.toLowerCase() === email,
  );

  if (existing) {
    userId = existing.id;
  } else {
    const { data: createdData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    if (createError || !createdData?.user) {
      return json(
        { error: "createUser failed", detail: createError?.message ?? "unknown" },
        500,
      );
    }
    userId = createdData.user.id;
    created = true;
  }

  const superAdminId = userId.replace(/-/g, "");
  const { error: insertError } = await supabaseAdmin
    .from("super_admins")
    .insert({ id: superAdminId, user_id: userId });

  const alreadyAdmin =
    insertError?.code === "23505" ||
    insertError?.message?.toLowerCase().includes("duplicate");

  if (insertError && !alreadyAdmin) {
    return json(
      { error: "INSERT into super_admins failed", detail: insertError.message },
      500,
    );
  }

  return json({
    success: true,
    user_id: userId,
    email,
    created,
    already_admin: !!alreadyAdmin,
  });
});
