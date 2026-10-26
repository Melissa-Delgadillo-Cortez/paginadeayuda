/** Sanitiza el snippet de búsqueda en el cliente: solo permite <b>. */
export function cleanSnippet(html: string): string {
  return html
    .replace(/<(?!\/?b\b)[^>]*>/g, "")
    .replace(/javascript:/gi, "");
}
