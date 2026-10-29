import { createClient } from "@/lib/supabase/server";
import { ArticleEditor } from "@/components/admin/article-editor";

export default async function NewArticlePage() {
  const supabase = await createClient();
  const { data: articles } = await supabase
    .from("articles")
    .select("id, title, parent_id")
    .order("position");

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-4 text-2xl font-bold text-slate-800">Nuevo artículo</h1>
      <ArticleEditor articles={articles ?? []} />
    </div>
  );
}
