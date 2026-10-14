/**
 * Utilidades de formato/validación para inputs de formularios.
 */

/**
 * Formatea cédula al escribir.
 * - Si el usuario escribe un número, antepone automáticamente "V-"
 * - Permite prefijos V- o E- y hasta 8 dígitos
 * @param {string} raw
 * @returns {string}
 */
export function formatCedulaInput(raw) {
  if (raw == null || raw === "") return "";

  let s = String(raw).toUpperCase().replace(/\s/g, "");
  s = s.replace(/[^VE0-9-]/g, "");

  if (!s) return "";

  // Empieza con dígito → V-{dígitos}
  if (/^\d/.test(s)) {
    const digits = s.replace(/\D/g, "").slice(0, 8);
    return digits ? `V-${digits}` : "V-";
  }

  // Solo letra V o E → agregar guión
  if (s === "V" || s === "E") return `${s}-`;

  // V- / E- / V123 / E123
  const m = s.match(/^([VE])-?(.*)$/);
  if (m) {
    const letter = m[1];
    const digits = String(m[2] || "")
      .replace(/\D/g, "")
      .slice(0, 8);
    return `${letter}-${digits}`;
  }

  const digits = s.replace(/\D/g, "").slice(0, 8);
  return digits ? `V-${digits}` : "V-";
}

/**
 * Valida cédula en formato V-/E- o solo dígitos (1–8).
 * @param {string} cedula
 * @returns {{ valid: boolean, message?: string }}
 */
export function validateCedulaFormat(cedula) {
  const v = String(cedula || "").trim().toUpperCase();
  if (!v) return { valid: false, message: "La cédula es obligatoria" };
  if (/^\d{1,8}$/.test(v)) return { valid: true };
  if (/^[VE]-\d{1,8}$/.test(v)) return { valid: true };
  return {
    valid: false,
    message: "Formato inválido. Use V-12345678 o E-12345678",
  };
}

/** Solo dígitos enteros */
export function onlyDigits(value, maxLength = 20) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, maxLength);
}

/**
 * Solo número decimal (un punto).
 * @param {string|number} value
 * @param {number} maxDecimals
 */
export function onlyDecimal(value, maxDecimals = 4) {
  let s = String(value ?? "").replace(/[^\d.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s =
      s.slice(0, firstDot + 1) +
      s.slice(firstDot + 1).replace(/\./g, "");
  }
  if (maxDecimals >= 0 && firstDot !== -1) {
    const [intPart, decPart = ""] = s.split(".");
    s = `${intPart}.${decPart.slice(0, maxDecimals)}`;
  }
  return s;
}

/** Teléfono: solo dígitos (y guión opcional al formatear luego) */
export function onlyPhoneDigits(value, maxLength = 11) {
  return onlyDigits(value, maxLength);
}

/** Referencia de pago: letras, números y guiones */
export function alphanumericRef(value, maxLength = 40) {
  return String(value ?? "")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .slice(0, maxLength);
}

/**
 * Bloquea teclas no numéricas en inputs type="number"
 * (e, E, +, - permiten notación científica en el navegador).
 */
export function blockInvalidNumberKeys(e) {
  if (["e", "E", "+", "-"].includes(e.key)) {
    e.preventDefault();
  }
}

/**
 * onChange helper: aplica formatCedulaInput al valor del evento.
 */
export function handleCedulaChange(e, setter) {
  const formatted = formatCedulaInput(e.target.value);
  if (typeof setter === "function") setter(formatted);
  return formatted;
}
