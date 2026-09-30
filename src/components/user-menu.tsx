import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, LogOut, Settings2, ShieldCheck } from "lucide-react";

import { avatarUrl } from "@/lib/avatars";
import { personLabel } from "@/lib/person-label";
import { supabase } from "@/lib/supabase";

type UserMenuProps = {
  email: string;
  /** Nome de exibição escolhido em Configurações. */
  username: string | null;
  displayName: string | null;
  avatarPath: string | null;
  /** Só o administrador vê a área de pessoas. O banco confere de novo. */
  isAdmin?: boolean;
};

const ITEM_CLASS =
  "flex cursor-pointer items-center gap-2.5 rounded-input px-2.5 py-2 text-sm text-foreground/90 outline-none transition-colors data-[highlighted]:bg-white/[0.07]";

/**
 * Menu da conta no canto superior direito. `Configurações` leva para perfil e
 * acesso; `Usuários` só aparece para o administrador; `Sair` encerra a sessão.
 */
export function UserMenu({
  email,
  username,
  displayName,
  avatarPath,
  isAdmin = false,
}: UserMenuProps) {
  const navigate = useNavigate();
  const label = personLabel({ display_name: displayName, username, email });
  const photo = avatarUrl(avatarPath);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-input border border-white/10 bg-white/[0.04] pl-2 pr-2.5 text-sm font-medium transition-colors hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
          aria-label="Menu do usuário"
        >
          {photo ? (
            <img
              src={photo}
              alt=""
              className="size-7 shrink-0 rounded-full border border-white/10 object-cover"
            />
          ) : (
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-brand text-xs font-bold text-white uppercase">
              {label.slice(0, 2) || "?"}
            </span>
          )}

          <span className="hidden max-w-[10rem] truncate sm:block">{label}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[13rem] animate-fade-in-scale rounded-card border border-white/10 bg-[#12121a] p-1.5 shadow-soft"
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium">{label}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>

          <DropdownMenu.Separator className="my-1.5 h-px bg-white/10" />

          <DropdownMenu.Item asChild>
            <Link to="/dashboard/settings" className={ITEM_CLASS}>
              <Settings2 className="size-4 text-muted-foreground" />
              Configurações
            </Link>
          </DropdownMenu.Item>

          {isAdmin && (
            <DropdownMenu.Item asChild>
              <Link to="/dashboard/admin" className={ITEM_CLASS}>
                <ShieldCheck className="size-4 text-muted-foreground" />
                Usuários
              </Link>
            </DropdownMenu.Item>
          )}

          <DropdownMenu.Separator className="my-1.5 h-px bg-white/10" />

          <DropdownMenu.Item
            className={ITEM_CLASS}
            onSelect={async () => {
              await supabase().auth.signOut();
              void navigate({ to: "/login", replace: true });
            }}
          >
            <LogOut className="size-4 text-muted-foreground" />
            Sair
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
