import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArticleEditor } from "@/components/admin/article-editor";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) notFound();

  const supabase = await createClient();
  const [{ data: article }, { data: articles }] = await Promise.all([
    supabase
      .from("articles")
      .select("id, title, html, parent_id")
      .eq("id", numId)
      .single(),
    supabase.from("articles").select("id, title, parent_id").order("position"),
  ]);

  if (!article) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-4 text-2xl font-bold text-slate-800">
        Editar artículo
      </h1>
      <ArticleEditor article={article} articles={articles ?? []} />
    </div>
  );
}
