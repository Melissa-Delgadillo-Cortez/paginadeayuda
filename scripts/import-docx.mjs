/**
 * Importador del documento Word "PAGINA DE AYUDA" a contenido estructurado.
 *
 * Uso:
 *   node scripts/import-docx.mjs <ruta-carpeta-extraida-del-docx>
 *
 * La carpeta extraída debe contener word/document.xml, word/_rels/document.xml.rels
 * y word/media/. Para extraer un .docx en Windows (PowerShell):
 *   Copy-Item "doc.docx" doc.zip; Expand-Archive doc.zip extracted
 *
 * Salida:
 *   public/content/*.png|jpeg  -> imágenes del documento
 *   src/content/articles.json  -> artículos [{ title, html }]
 */
import fs from 'node:fs';
import path from 'node:path';

const extractedDir = process.argv[2];
if (!extractedDir) {
  console.error('Uso: node scripts/import-docx.mjs <carpeta-extraida-del-docx>');
  process.exit(1);
}

const docXml = fs.readFileSync(path.join(extractedDir, 'word/document.xml'), 'utf8');
const relsXml = fs.readFileSync(
  path.join(extractedDir, 'word/_rels/document.xml.rels'),
  'utf8'
);
const numberingXml = fs.existsSync(path.join(extractedDir, 'word/numbering.xml'))
  ? fs.readFileSync(path.join(extractedDir, 'word/numbering.xml'), 'utf8')
  : '';

// ---------- relaciones: rId -> { type, target } ----------
const rels = {};
for (const m of relsXml.matchAll(/<Relationship\b[^>]*>/g)) {
  const tag = m[0];
  const id = /Id="([^"]+)"/.exec(tag)?.[1];
  const type = /Type="[^"]*\/(\w+)"/.exec(tag)?.[1];
  const target = /Target="([^"]+)"/.exec(tag)?.[1];
  if (id) rels[id] = { type, target };
}

// ---------- numeración: numId -> formato ----------
const numFmt = {}; // numId -> 'bullet' | 'decimal'
const absFmt = {}; // abstractNumId -> fmt
for (const m of numberingXml.matchAll(
  /<w:abstractNum\b[^>]*w:abstractNumId="(\d+)"[^>]*>([\s\S]*?)<\/w:abstractNum>/g
)) {
  const lvl0 = /<w:lvl\b[^>]*w:ilvl="0"[\s\S]*?<\/w:lvl>/.exec(m[2]);
  const fmt = /<w:numFmt w:val="([^"]+)"/.exec(lvl0?.[0] ?? m[2])?.[1];
  absFmt[m[1]] = fmt === 'decimal' ? 'decimal' : 'bullet';
}
for (const m of numberingXml.matchAll(
  /<w:num\b[^>]*w:numId="(\d+)"[^>]*>[\s\S]*?<w:abstractNumId w:val="(\d+)"/g
)) {
  numFmt[m[1]] = absFmt[m[2]] ?? 'bullet';
}

// ---------- helpers ----------
const esc = (s) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const images = new Set();
function imageTag(rId) {
  const rel = rels[rId];
  if (!rel || rel.type !== 'image') return '';
  const file = path.basename(rel.target);
  images.add(file);
  return `<img src="/media/${esc(file)}" alt="" loading="lazy" />`;
}

// Convierte el XML interno de un <w:r> a HTML (texto, saltos, imágenes)
function runToHtml(runXml, inheritedB = false, inheritedI = false) {
  const rPr = /<w:rPr>([\s\S]*?)<\/w:rPr>/.exec(runXml)?.[1] ?? '';
  const b = inheritedB || /<w:b\s*\/>/.test(rPr) || /<w:b\s/.test(rPr);
  const i = inheritedI || /<w:i\s*\/>/.test(rPr) || /<w:i\s/.test(rPr);
  const u = /<w:u w:val="(?!none)/.test(rPr);

  let out = '';
  // tokens en orden: texto, salto de línea, dibujo/imagen
  const tokRe =
    /<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:br\s*\/>|<w:tab\s*\/>|<w:drawing>([\s\S]*?)<\/w:drawing>/g;
  for (const t of runXml.matchAll(tokRe)) {
    let piece;
    if (t[1] !== undefined) piece = esc(t[1]);
    else if (t[0].startsWith('<w:br')) piece = '<br/>';
    else if (t[0].startsWith('<w:tab')) piece = '&emsp;';
    else {
      const embed = /r:embed="(rId\d+)"/.exec(t[2])?.[1];
      piece = embed ? imageTag(embed) : '';
      out += piece;
      continue;
    }
    if (b) piece = `<strong>${piece}</strong>`;
    if (i) piece = `<em>${piece}</em>`;
    if (u) piece = `<u>${piece}</u>`;
    out += piece;
  }
  return out;
}

// Convierte el contenido de un <w:p> a HTML (maneja hyperlinks y runs)
function paragraphInnerHtml(pXml) {
  let out = '';
  const tokRe =
    /<w:hyperlink\b[^>]*>([\s\S]*?)<\/w:hyperlink>|<w:r\b[^>]*(?:\/>|>([\s\S]*?)<\/w:r>)/g;
  for (const t of pXml.matchAll(tokRe)) {
    if (t[1] !== undefined) {
      // hyperlink
      const rId = /r:id="(rId\d+)"/.exec(t[0].slice(0, 200))?.[1];
      const url = rels[rId]?.type === 'hyperlink' ? rels[rId].target : null;
      const inner = [...t[1].matchAll(/<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g)]
        .map((r) => runToHtml(r[1]))
        .join('');
      out += url
        ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${inner}</a>`
        : inner;
    } else {
      out += runToHtml(t[2] ?? '');
    }
  }
  return out;
}

// ---------- parseo principal ----------
const articles = [];
let current = null; // { title, blocks: [] }
let counters = {}; // numId -> contador para listas ordenadas
let openList = null; // 'ul' | 'ol'

function closeList() {
  if (openList && current) {
    current.blocks.push(`</${openList}>`);
    openList = null;
  }
  counters = {};
}
function ensureArticle() {
  if (!current) current = { title: 'General', blocks: [] };
  return current;
}
function pushBlock(html) {
  if (!html.trim()) return;
  ensureArticle().blocks.push(html);
}

const paraRe = /<w:p\b[^>]*(?:\/>|>([\s\S]*?)<\/w:p>)/g;
let paraIndex = 0;
for (const m of docXml.matchAll(paraRe)) {
  paraIndex++;
  const p = m[1] ?? '';
  const style = /<w:pStyle w:val="([^"]+)"/.exec(p)?.[1];
  const numPr = /<w:numPr>([\s\S]*?)<\/w:numPr>/.exec(p)?.[1];
  const html = paragraphInnerHtml(p);

  const isHeading =
    style === 'Ttulo1' || style === 'Ttulo2' || style === 'Ttulo3' ||
    style === 'Heading1' || style === 'Heading2' || style === 'Heading3';

  if (isHeading) {
    closeList();
    const text = html.replace(/<[^>]+>/g, '').trim();
    if (!text) continue;
    if (style === 'Ttulo1' || style === 'Heading1') {
      if (current) articles.push(current);
      current = { title: text, blocks: [] };
    } else {
      const tag = style === 'Ttulo2' || style === 'Heading2' ? 'h2' : 'h3';
      pushBlock(`<${tag} id="s${paraIndex}">${html}</${tag}>`);
    }
    continue;
  }

  if (numPr) {
    const numId = /<w:numId w:val="(\d+)"/.exec(numPr)?.[1] ?? '0';
    const ilvl = parseInt(/<w:ilvl w:val="(\d+)"/.exec(numPr)?.[1] ?? '0', 10);
    const fmt = numFmt[numId] ?? 'bullet';
    const listTag = fmt === 'decimal' && ilvl === 0 ? 'ol' : 'ul';
    if (openList !== listTag) {
      closeList();
      ensureArticle().blocks.push(`<${listTag}>`);
      openList = listTag;
    }
    if (listTag === 'ol' && !counters[numId]) counters[numId] = 0;
    if (ilvl > 0) {
      ensureArticle().blocks.push(
        `<li class="ml-${Math.min(ilvl, 6) * 6}">${html}</li>`
      );
    } else {
      ensureArticle().blocks.push(`<li>${html}</li>`);
    }
    continue;
  }

  closeList();
  if (html.trim()) pushBlock(`<p>${html}</p>`);
}
closeList();
if (current) articles.push(current);

// ---------- salida ----------
const root = process.cwd();
const mediaDir = path.join(extractedDir, 'word/media');
const publicContent = path.join(root, 'content-media');
fs.mkdirSync(publicContent, { recursive: true });
let copied = 0;
for (const file of images) {
  const src = path.join(mediaDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(publicContent, file));
    copied++;
  }
}

const outDir = path.join(root, 'src/content');
fs.mkdirSync(outDir, { recursive: true });
const data = articles.map((a, i) => ({
  position: i,
  title: a.title,
  html: a.blocks.join('\n'),
}));
fs.writeFileSync(
  path.join(outDir, 'articles.json'),
  JSON.stringify(data, null, 2),
  'utf8'
);

console.log(`Artículos: ${articles.length}`);
console.log(`Imágenes copiadas: ${copied}/${images.size}`);
console.log('Primeros títulos:');
for (const a of articles.slice(0, 15)) console.log('  -', a.title);
