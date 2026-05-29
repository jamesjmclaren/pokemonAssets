/**
 * Escapes HTML special characters to prevent HTML/script injection when
 * interpolating user-supplied strings into email templates or markup.
 *
 * Use this on ANY value that originated from user input before placing it
 * inside an HTML string (e.g. Maileroo email bodies).
 */
export function escapeHtml(value: unknown): string {
  const str = value == null ? "" : String(value);
  return str.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#039;";
      default:
        return char;
    }
  });
}
