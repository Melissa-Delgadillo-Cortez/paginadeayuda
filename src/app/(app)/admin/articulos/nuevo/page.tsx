import { ArticleEditor } from "@/components/admin/article-editor";

export default function NewArticlePage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-4 text-2xl font-bold text-slate-800">Nuevo artículo</h1>
      <ArticleEditor />
    </div>
  );
}
