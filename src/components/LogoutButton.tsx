import { logout } from "@/lib/actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="text-sm text-neutral-500 transition-colors hover:text-neutral-100"
        aria-label="Log out"
        title="Log out"
      >
        ⎋
      </button>
    </form>
  );
}
