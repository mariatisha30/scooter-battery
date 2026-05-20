// Calling `redirect()` inside a server action throws a special error with
// `digest: "NEXT_REDIRECT;...;..."`. Client code that wraps the action call in
// try/catch must re-throw this so Next.js can perform the redirect — otherwise
// users see "NEXT_REDIRECT" in the form's error slot.

export function isRedirectError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { message?: unknown; digest?: unknown };
  if (e.message === "NEXT_REDIRECT") return true;
  return typeof e.digest === "string" && e.digest.startsWith("NEXT_REDIRECT");
}
