import { createClient } from "@/lib/supabase/server";
import { LinksManager } from "@/components/links-manager";

export default async function LinksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: links }, { data: profile }] = await Promise.all([
    supabase.from("links").select("*").order("position").order("name"),
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-800">Enlaces</h1>
      <div className="mt-5">
        <LinksManager
          links={links ?? []}
          isAdmin={profile?.role === "admin"}
        />
      </div>
    </div>
  );
}
