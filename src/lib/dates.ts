/** Todas las fechas mostradas usan hora de Bolivia (UTC-4). */
export const TZ_BO = "America/La_Paz";

/** "1 nov 2026" estilo es-BO completo */
export const fmtDateBO = (iso: string | Date) =>
  new Date(iso).toLocaleDateString("es-BO", { timeZone: TZ_BO });

/** "1 nov" corto */
export const fmtShortBO = (iso: string | Date) =>
  new Date(iso).toLocaleDateString("es-BO", {
    timeZone: TZ_BO,
    day: "numeric",
    month: "short",
  });

/** "1 nov, 14:30" */
export const fmtDateTimeBO = (iso: string | Date) =>
  new Date(iso).toLocaleString("es-BO", {
    timeZone: TZ_BO,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/** "1/11/2026, 14:30" con año */
export const fmtFullBO = (iso: string | Date) =>
  new Date(iso).toLocaleString("es-BO", { timeZone: TZ_BO });
