import { login } from "@/lib/actions";
import { BrandMark } from "@/components/BrandMark";

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
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark size={56} />
          <h1 className="mt-4 text-xl font-semibold tracking-tight">Scooter Battery</h1>
          <p className="mt-1 text-xs text-muted">Enter your password to continue</p>
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
            className={`w-full rounded-2xl px-4 py-3.5 text-center text-base focus:outline-none ${
              error
                ? "bg-red/10 text-red ring-1 ring-red/50 focus:ring-red"
                : "glass text-fg focus:ring-1 focus:ring-acc/60"
            }`}
          />

          {error && <p className="text-center text-xs text-red">Wrong password — try again.</p>}

          <button
            type="submit"
            className="w-full rounded-2xl bg-acc py-3.5 text-sm font-semibold text-acc-ink transition hover:brightness-110"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
