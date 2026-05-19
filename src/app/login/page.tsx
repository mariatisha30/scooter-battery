import { login } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-xs">
        <div className="mb-8 text-center">
          <div
            className="mx-auto grid h-14 w-14 place-items-center rounded-2xl text-3xl"
            style={{
              background: "linear-gradient(135deg, #064e3b 0%, #0a0a0a 60%)",
              color: "#34d399",
            }}
          >
            ⚡
          </div>
          <h1 className="mt-4 text-xl font-semibold text-neutral-100">Scooter Battery</h1>
          <p className="mt-1 text-xs text-neutral-500">Enter password to continue</p>
        </div>

        <form action={login} className="space-y-3">
          <input type="hidden" name="next" value={next ?? "/"} />
          <input
            type="password"
            name="password"
            autoFocus
            required
            autoComplete="current-password"
            placeholder="Password"
            className={`w-full rounded-xl border px-4 py-3 text-center text-base tabular-nums focus:outline-none ${
              error
                ? "border-red-500/50 bg-red-500/5 text-red-200 focus:border-red-500"
                : "border-neutral-800 bg-neutral-900 text-neutral-100 focus:border-emerald-500"
            }`}
          />

          {error && (
            <p className="text-center text-xs text-red-400">Wrong password — try again.</p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-400"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
