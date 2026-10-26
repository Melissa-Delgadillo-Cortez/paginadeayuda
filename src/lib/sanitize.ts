import sanitizeHtml from "sanitize-html";

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr", "strong", "b", "em", "i", "u", "s",
    "h2", "h3", "h4",
    "ul", "ol", "li",
    "a", "img", "span", "blockquote", "code", "pre",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "loading", "width", "height"],
    li: ["class"],
    span: ["class"],
    h2: ["id"],
    h3: ["id"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"],
  },
  allowedSchemes: ["https", "http", "mailto", "tel"],
  // Solo permitimos imágenes servidas por nuestra ruta autenticada
  allowedSchemesByTag: { img: ["http", "https"] },
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, rel: "noopener noreferrer", target: "_blank" },
    }),
    img: (tagName, attribs): sanitizeHtml.Tag => {
      const src = attribs.src ?? "";
      // Solo imágenes locales bajo /media/ — bloquea imágenes externas
      if (!src.startsWith("/media/")) {
        return { tagName: "span", attribs: {}, text: "" };
      }
      return {
        tagName,
        attribs: { src, alt: attribs.alt ?? "", loading: "lazy" },
      };
    },
  },
};

/** Sanitiza HTML de artículos antes de guardarlo/renderizarlo. */
export function cleanArticleHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}

/** HTML a texto plano (para índice de búsqueda). */
export function htmlToText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}

/** Sanitiza snippets de búsqueda (solo conserva <b> de ts_headline). */
export function cleanSnippet(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["b"],
    allowedAttributes: {},
  });
}
