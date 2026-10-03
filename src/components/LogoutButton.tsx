import { IconLogout } from "@tabler/icons-react";
import { logout } from "@/lib/actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="glass flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm text-muted transition-colors hover:text-fg"
      >
        <IconLogout size={16} stroke={1.75} aria-hidden />
        Log out
      </button>
    </form>
  );
}
