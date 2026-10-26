/**
 * Parser del Excel "ROL DE CONTACTOS DE EMERGENCIA".
 * Compartido entre el seed (node) y la importación web del admin (browser).
 *
 * Recibe un workbook de SheetJS y devuelve filas para la tabla `contacts`.
 */

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

// Excel serial date -> ISO (UTC). frac = fracción de día (horas de Excel).
function excelDate(serial, frac = 0) {
  if (!Number.isFinite(serial)) return null;
  const ms = Math.round((serial - 25569 + frac) * 86400 * 1000);
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const END_OF_DAY = 0.9999884; // 23:59:59

function classifyHeaders(header) {
  // Devuelve { type: 'rotation'|'directory', cols: {...} }
  const cols = {
    grp: -1, start: -1, end: -1, startTime: -1, endTime: -1,
    person: -1, phones: [], emails: [],
    support: -1, escalIdx: [],
  };
  let hasStart = false, hasEnd = false;

  header.forEach((h, i) => {
    const n = norm(h);
    if (!n) return;
    if (/^(ciudad|sucursal|empresa|tipo de seguro|nacional|tarjetas|area|la paz|santa cruz)$/.test(n)) cols.grp = i;
    if (/^fecha.*(inicio|inico|incio)$|^fecha$|^inicio$/.test(n)) { cols.start = i; hasStart = true; }
    if (/^fecha.*fin$|^fin$/.test(n)) { cols.end = i; hasEnd = true; }
    if (/^hora.*(inicio|inico|incio)$/.test(n)) cols.startTime = i;
    if (/^hora.*fin$/.test(n)) cols.endTime = i;
    if (/persona.*turno|^nombre$|nombre ejecutivo|ejecutivo principal|nombre de asistente|^destinatarios$|personas relacionadas/.test(n) && cols.person === -1) cols.person = i;
    if (/ejecutivo.*apoyo|^apoyo$/.test(n)) cols.support = i;
    if (/telefono/.test(n)) cols.phones.push(i);
    if (/correo/.test(n)) cols.emails.push(i);
    if (/escalamiento/.test(n)) cols.escalIdx.push(i);
  });

  return { type: hasStart && hasEnd ? "rotation" : "directory", cols };
}

const isEmptyRow = (row) => row.every((c) => String(c ?? "").trim() === "");
const nonEmptyCells = (row) => row.filter((c) => String(c ?? "").trim() !== "").length;

const asText = (v) => String(v ?? "").trim();

function parseRotation(rows, cols, area, push) {
  let grp = "";
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (isEmptyRow(row)) continue;

    // Fila marcador de ciudad/grupo: solo la primera celda con texto
    if (nonEmptyCells(row) === 1 && asText(row[0])) {
      grp = asText(row[0]).slice(0, 80);
      continue;
    }

    // serials de Excel válidos (>30000 ≈ año 1982+); celdas vacías -> Number('')=0
    if (asText(row[cols.start]) === "" || asText(row[cols.end]) === "") continue;
    const startSerial = Number(row[cols.start]);
    const endSerial = Number(row[cols.end]);
    if (
      !Number.isFinite(startSerial) || !Number.isFinite(endSerial) ||
      startSerial < 30000 || endSerial < 30000
    ) continue;

    const st = cols.startTime >= 0 ? Number(row[cols.startTime]) : 0;
    const en = cols.endTime >= 0 ? Number(row[cols.endTime]) : END_OF_DAY;
    const start_at = excelDate(startSerial, Number.isFinite(st) ? st : 0);
    const end_at = excelDate(
      endSerial,
      Number.isFinite(en) ? en : END_OF_DAY
    );
    if (!start_at || !end_at) continue;

    // Escalamientos: cada col "escalamiento" + las 2 columnas siguientes (tel, correo)
    const escalation = [];
    for (const ei of cols.escalIdx) {
      const name = asText(row[ei]);
      const phone = asText(row[ei + 1]);
      const email = asText(row[ei + 2]);
      if (name || phone || email) escalation.push({ name, phone, email });
    }

    push({
      area,
      grp,
      person: asText(row[cols.person]),
      phone: asText(row[cols.phones[0]]),
      email: asText(row[cols.emails[0]]),
      support_name: cols.support >= 0 ? asText(row[cols.support]) : "",
      support_phone: asText(row[cols.phones[1]] ?? row[cols.support + 1]),
      support_email: asText(row[cols.emails[1]] ?? row[cols.support + 2]),
      escalation,
      start_at,
      end_at,
      extra: [],
    });
  }
}

const GROUP_HEADER_RE =
  /^(ciudad|sucursal|empresa|empresa\/institucion|tipo de seguro|nacional|tarjetas nacional|area|periodo)$/;

function parseDirectory(rows, cols, header, area, push) {
  let grp = "";
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (isEmptyRow(row)) continue;

    // Marcador de grupo: una sola celda no vacía y corta
    const filled = nonEmptyCells(row);
    if (filled === 1) {
      const v = asText(row[0]);
      if (v.length <= 60) {
        grp = v;
        continue;
      }
      // celda larga = nota
      push({
        area, grp, person: "", phone: "", email: "",
        support_name: "", support_phone: "", support_email: "",
        escalation: [], start_at: null, end_at: null,
        extra: [{ label: "Nota", value: v }],
      });
      continue;
    }

    const extra = [];
    header.forEach((h, ci) => {
      const v = asText(row[ci]);
      if (!v) return;
      const isMapped =
        ci === cols.person || cols.phones.includes(ci) ||
        cols.emails.includes(ci) || ci === cols.support;
      const hn = asText(h);
      if (!isMapped && hn && !/^columna/.test(norm(hn))) {
        extra.push({ label: hn, value: v });
      } else if (!isMapped && !hn && v && ci === 0) {
        // col0 sin header útil: suele ser el agrupador de la fila
        if (GROUP_HEADER_RE.test(norm(header[0]))) {
          extra.unshift({ label: asText(header[0]) || "Grupo", value: v });
        }
      }
    });

    // persona: columna nombre-ish, si no, primera celda con texto
    let person = cols.person >= 0 ? asText(row[cols.person]) : "";
    if (!person) {
      const firstIdx = row.findIndex((c) => asText(c));
      person = firstIdx >= 0 ? asText(row[firstIdx]) : "";
      if (firstIdx === 0 && extra.length) {
        // evita duplicar col0 en person y extra
        const j = extra.findIndex((e) => e.value === person);
        if (j >= 0) extra.splice(j, 1);
      }
    }

    const phones = cols.phones.map((ci) => asText(row[ci])).filter(Boolean);
    const emails = cols.emails.map((ci) => asText(row[ci])).filter(Boolean);

    // si la fila tiene su propio grupo en col0 (p.ej. TIPO DE SEGURO), usarlo
    let rowGrp = grp;
    if (cols.grp >= 0 && asText(row[cols.grp]) && norm(header[cols.grp]) !== "ciudad") {
      // mantiene el marcador como contexto pero prioriza la celda de la fila
      if (!rowGrp) rowGrp = asText(row[cols.grp]);
    } else if (cols.grp >= 0 && asText(row[cols.grp])) {
      rowGrp = asText(row[cols.grp]);
    }

    if (!person && phones.length === 0 && emails.length === 0 && extra.length === 0)
      continue;

    push({
      area,
      grp: rowGrp.slice(0, 80),
      person: person.slice(0, 120),
      phone: phones.join(" / ").slice(0, 120),
      email: emails.join(" / ").slice(0, 200),
      support_name: cols.support >= 0 ? asText(row[cols.support]) : "",
      support_phone: "",
      support_email: "",
      escalation: [],
      start_at: null,
      end_at: null,
      extra,
    });
  }
}

/**
 * @param {{name: string, rows: any[][]}[]} sheets - hojas ya convertidas a
 *   arrays (SheetJS: XLSX.utils.sheet_to_json(ws, {header:1, defval:""}))
 * @returns {{contacts: object[], areas: string[], warnings: string[]}}
 */
export function parseWorkbook(sheets) {
  const contacts = [];
  const warnings = [];
  const areas = [];
  let position = 0;
  const push = (c) => contacts.push({ ...c, position: position++ });

  for (const { name, rows } of sheets) {
    if (!rows.length) continue;
    const header = rows[0].map(asText);
    const { type, cols } = classifyHeaders(header);
    const area = name.trim().replace(/\s+/g, " ").slice(0, 60);
    areas.push(area);

    if (type === "rotation") {
      const before = contacts.length;
      parseRotation(rows, cols, area, push);
      if (contacts.length === before) {
        warnings.push(`${area}: sin filas de turno detectadas`);
      }
    } else {
      parseDirectory(rows, cols, header, area, push);
    }
  }
  return { contacts, areas, warnings };
}
