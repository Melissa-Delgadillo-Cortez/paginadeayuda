/**
 * Parser del Excel de ROTA (horarios semanales de operadores).
 *
 * Formato esperado por hoja (ej. "SEM 1"):
 *   fila 0: título "ROTA DEL …"
 *   fila 1: "Nombre" | Lunes ×4 | Martes ×4 | … | Domingo ×4
 *   fila 2: por día: E 1 | S1 | E2 | S2
 *   fila 3+: nombre del operador y seriales Excel de fecha/hora
 *            (fracción del día = hora), "LIBRE" o vacío.
 *
 * Salida por operador:
 *   { name, days: { dow: 0-6 (0=lun), libre, turns: [{start,end}] }[7] }
 *   start/end en minutos desde medianoche. end <= start = cruza medianoche.
 */

const DOW_IDX = {
  lunes: 0,
  martes: 1,
  miercoles: 2,
  jueves: 3,
  viernes: 4,
  sabado: 5,
  domingo: 6,
};

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Serial Excel → minutos del día (0-1439). Tolera serial puro o fracción. */
function serialToMin(v) {
  if (typeof v !== "number" || !isFinite(v)) return null;
  const frac = ((v % 1) + 1) % 1; // 0..1
  let m = Math.round(frac * 1440);
  if (m === 1440) m = 0;
  return m;
}

/**
 * Detecta qué hojas del workbook tienen formato ROTA.
 * @param {{name: string, rows: any[][]}[]} sheets
 * @returns {string[]} nombres de hojas válidas
 */
export function detectRotaSheets(sheets) {
  const out = [];
  for (const sh of sheets) {
    const head = (sh.rows ?? []).slice(0, 4).flat().map(norm);
    const hasName = head.includes("nombre") || head.includes("agente");
    const daysFound = head.filter((h) => DOW_IDX[h] !== undefined);
    if (hasName && daysFound.length >= 5) out.push(sh.name);
  }
  return out;
}

/**
 * Parsea una hoja ROTA.
 * @param {any[][]} rows
 * @returns {{ operators: {name:string,days:object[]}[], warnings: string[] }}
 */
export function parseRotaSheet(rows) {
  const warnings = [];
  // Localizar la fila de encabezados de días (la que tiene "nombre")
  let nameRow = -1;
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    if ((rows[i] ?? []).map(norm).includes("nombre")) {
      nameRow = i;
      break;
    }
  }
  if (nameRow === -1) return { operators: [], warnings: ["No se encontró la fila de encabezados."] };

  // Mapear columna → dow: cada día ocupa 4 columnas desde su cabecera
  const head = (rows[nameRow] ?? []).map(norm);
  const dayMap = []; // [{dow, col}]
  for (let c = 1; c < head.length; c++) {
    const dow = DOW_IDX[head[c]];
    if (dow !== undefined && !dayMap.some((d) => d.dow === dow)) {
      dayMap.push({ dow, col: c });
    }
  }

  const operators = [];
  for (let i = nameRow + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const name = String(row[0] ?? "").trim();
    if (!name) continue;
    if (/^(extras|disponibles|total|horas extras|rota del)/i.test(name)) break;

    const days = Array.from({ length: 7 }, (_, dow) => ({
      dow,
      libre: false,
      turns: [],
    }));

    for (const { dow, col } of dayMap) {
      const cells = row.slice(col, col + 4);
      if (cells.map((c) => norm(c)).includes("libre")) {
        days[dow].libre = true;
        continue;
      }
      const [e1, s1, e2, s2] = cells.map(serialToMin);
      if (e1 !== null && s1 !== null) days[dow].turns.push({ start: e1, end: s1 });
      else if (e1 !== null || s1 !== null)
        warnings.push(`${name}: día ${dow} turno 1 incompleto (se ignora)`);
      if (e2 !== null && s2 !== null) days[dow].turns.push({ start: e2, end: s2 });
      else if (e2 !== null || s2 !== null)
        warnings.push(`${name}: día ${dow} turno 2 incompleto (se ignora)`);
    }

    const hasData = days.some((d) => d.libre || d.turns.length > 0);
    if (hasData) operators.push({ name, days });
  }

  return { operators, warnings };
}
