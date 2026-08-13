import type { ZodError } from "zod";

export type FieldErrors = Record<string, string>;

export function zodToFieldErrors(error: ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_root";
    if (!(path in out)) out[path] = issue.message;
  }
  return out;
}