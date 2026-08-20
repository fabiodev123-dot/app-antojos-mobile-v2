"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function setActingTenant(tenantId: string) {
  const cookieStore = await cookies();
  cookieStore.set("acting_tenant_id", tenantId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  revalidatePath("/", "layout");
}

export async function clearActingTenant() {
  const cookieStore = await cookies();
  cookieStore.delete("acting_tenant_id");
  revalidatePath("/", "layout");
}
