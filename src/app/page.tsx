import { redirect } from "next/navigation";
import { getCurrentUserOrNull } from "@/lib/auth/context";
import HomeContent from "@/components/features/home-content";

export default async function HomePage() {
  const user = await getCurrentUserOrNull();
  if (!user) {
    redirect("/login");
  }
  return <HomeContent />;
}
