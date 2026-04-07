export const ADMIN_EMAILS = [
  "jamesjmclaren@gmail.com",
  "k1west.cityboy@gmail.com",
];

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
