import { supabase } from "@/lib/supabase";

export async function requireUserId(): Promise<string> {
  const { data } = await supabase().auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Você precisa estar logado.");
  return id;
}
