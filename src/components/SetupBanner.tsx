export function SetupBanner() {
  return (
    <section className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
      <div className="font-medium">Supabase not connected yet</div>
      <p className="mt-1 text-amber-200/80">
        Fill in <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="rounded bg-black/30 px-1">SUPABASE_SERVICE_ROLE_KEY</code> in{" "}
        <code className="rounded bg-black/30 px-1">.env.local</code>, then restart the dev server. See{" "}
        <code className="rounded bg-black/30 px-1">README.md</code> for the full setup.
      </p>
    </section>
  );
}
