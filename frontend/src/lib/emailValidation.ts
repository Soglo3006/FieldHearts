export type EmailValidationIssue = "empty" | "invalid";

export function getEmailValidationIssue(value: string): EmailValidationIssue | null {
  const trimmed = value.trim();
  if (!trimmed) return "empty";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "invalid";
  return null;
}
