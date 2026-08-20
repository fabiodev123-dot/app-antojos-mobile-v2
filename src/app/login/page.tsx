import { redirect } from "next/navigation";
import { getCurrentUserOrNull } from "@/lib/auth/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import LoginForm from "@/components/features/login-form";

export default async function LoginPage() {
  const user = await getCurrentUserOrNull();
  if (user) {
    const supabase = await createSupabaseServerClient();
    const { data: superAdmin } = await supabase
      .from("super_admins" as never)
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle() as { data: { id: string } | null };
    redirect(superAdmin ? "/admin" : "/");
  }
  return <LoginForm />;
}
