import { logout } from "@/lib/actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="text-sm text-neutral-400 transition-colors hover:text-neutral-100"
      >
        Log out
      </button>
    </form>
  );
}
