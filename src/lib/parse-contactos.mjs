/**
 * Parser genérico para Excel de turnos de ejecutivos.
 * Detecta columnas: nombre (nombre|ejecutivo|persona|agente), desde
 * (desde|inicio|fecha inicio), hasta (hasta|fin|fecha fin).
 * Si no hay cabecera clara usa las 3 primeras columnas.
 * Devuelve [{ name, since, until }] con fechas ISO "YYYY-MM-DD" o null.
 */

const norm = (s) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function toISO(v) {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10);
  if (typeof v === "number" && v > 20000 && v < 80000) {
    // serial de Excel (días desde 1899-12-30)
    return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  let m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/.exec(s);
  if (m) {
    const d = +m[1], mo = +m[2], y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

export function parseContactosSheet(rows) {
  const out = [];
  const warnings = [];
  let nameCol = 0, sinceCol = 1, untilCol = 2, firstData = 0;

  outer: for (let r = 0; r < Math.min(rows.length, 12); r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      const h = norm(row[c]);
      if (/nombre|ejecutiv|persona|agente|apellid/.test(h)) {
        nameCol = c;
        for (let c2 = c + 1; c2 < Math.min(row.length, c + 10); c2++) {
          const h2 = norm(row[c2]);
          if (/desde|inicio/.test(h2)) sinceCol = c2;
          if (/hasta|fin\b/.test(h2)) untilCol = c2;
        }
        firstData = r + 1;
        break outer;
      }
    }
  }

  const seen = new Set();
  for (let r = firstData; r < rows.length; r++) {
    const row = rows[r] || [];
    const name = String(row[nameCol] ?? "").trim();
    if (!name || /^(total|nota|observ)/i.test(name)) continue;
    const since = toISO(row[sinceCol]);
    const until = toISO(row[untilCol]);
    if (!since && !until) {
      if (seen.size || firstData > 0) continue; // fila sin fechas: se salta
      warnings.push(`"${name}" sin fechas, se omite`);
      continue;
    }
    if (seen.has(norm(name))) continue;
    seen.add(norm(name));
    out.push({ name, since, until });
  }
  return { rows: out, warnings };
}
