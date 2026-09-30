import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Hourglass, UserX } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AppSidebar, SidebarToggle } from "@/components/app-sidebar";
import { Logo } from "@/components/logo";
import { Spinner } from "@/components/spinner";
import type { Profile } from "@/lib/database.types";
import { getProfile } from "@/lib/profile-api";
import { isWaitingForApproval } from "@/lib/person-label";
import { hydrateAuth, useAuthSnapshot } from "@/lib/use-auth";

export const Route = createFileRoute("/dashboard")({
  // A sessão vive no localStorage, então o painel renderiza só no cliente.
  // Nada aqui é sensível: toda consulta continua restrita pela RLS.
  ssr: false,
  component: DashboardLayout,
});

function DashboardLayout() {
  const navigate = useNavigate();
  const { session } = useAuthSnapshot();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    void hydrateAuth().then(() => setReady(true));
  }, []);

  // O nome e a foto do menu vêm do perfil; falhar aqui não pode travar o painel,
  // então o menu cai no usuário do login.
  const loadProfile = useCallback(async () => {
    if (!session) return;
    try {
      setProfile(await getProfile());
    } catch {
      setProfile(null);
    } finally {
      setProfileLoaded(true);
    }
  }, [session]);

  useEffect(() => {
    if (ready && session) void loadProfile();
  }, [ready, session, loadProfile]);

  useEffect(() => {
    if (ready && !session) void navigate({ to: "/login", replace: true });
  }, [navigate, ready, session]);

  // A espera pelo perfil conta como carregando: sem `approved_at` em mãos não dá
  // para saber se a pessoa entra no painel ou na tela de aprovação, e errar
  // para o lado de mostrar o painel mostraria o botão de criar modelo para quem
  // não pode criar. O banco recusa de qualquer forma.
  if (!ready || !session || !profileLoaded) {
    return (
      <div className="grid min-h-dvh place-items-center bg-gradient-brand-soft">
        <Spinner className="size-6 text-brand-400" />
      </div>
    );
  }

  const rejected = profile !== null && profile.rejected_at !== null;
  const inactive = profile !== null && profile.deactivated_at !== null;
  const waiting = profile !== null && isWaitingForApproval(profile);

  return (
    <div className="min-h-dvh bg-gradient-brand-soft">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-gradient-brand-soft/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
          <SidebarToggle open={menuAberto} onOpenChange={setMenuAberto} />
          <Logo />
        </div>
      </header>

      <AppSidebar
        open={menuAberto}
        onOpenChange={setMenuAberto}
        email={session.user.email ?? ""}
        username={profile?.username ?? null}
        displayName={profile?.display_name ?? null}
        avatarPath={profile?.avatar_path ?? null}
        isAdmin={profile?.is_admin ?? false}
      />

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {rejected ? (
          <RejectedNotice name={profile?.display_name ?? profile?.username} />
        ) : inactive ? (
          <InactiveNotice name={profile?.display_name ?? profile?.username} />
        ) : waiting ? (
          <WaitingApproval name={profile?.display_name ?? profile?.username} />
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}

/** Conta cadastrada, aguardando o administrador liberar. */
function WaitingApproval({ name }: { name: string | null }) {
  return (
    <div className="mx-auto max-w-lg rounded-card border border-white/[0.06] bg-white/[0.03] p-8 text-center">
      <div className="mx-auto mb-5 grid size-12 place-items-center rounded-full bg-amber-500/15">
        <Hourglass className="size-6 text-amber-300" />
      </div>

      <h1 className="text-lg font-semibold">Aguardando aprovação</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {name ? `${name}, sua ` : "Sua "}conta foi criada e já está na fila. Assim que for aprovada,
        você consegue criar sua modelo, configurar o pixel e gerar links.
      </p>
      <p className="mt-4 text-xs text-muted-foreground/80">
        Dá para ajustar seu nome e foto pelo menu do seu perfil, no canto superior direito.
      </p>
    </div>
  );
}

/** Conta que estava aprovada e foi desligada. */
function InactiveNotice({ name }: { name: string | null }) {
  return (
    <div className="mx-auto max-w-lg rounded-card border border-white/[0.06] bg-white/[0.03] p-8 text-center">
      <div className="mx-auto mb-5 grid size-12 place-items-center rounded-full bg-white/[0.08]">
        <UserX className="size-6 text-muted-foreground" />
      </div>

      <h1 className="text-lg font-semibold">Acesso desativado</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {name ? `${name}, seu ` : "Seu "}acesso foi desativado e o que você criou continua aqui, mas
        não dá para criar modelo nem link. Se isso foi engano, fale com quem administra.
      </p>
    </div>
  );
}

/** Conta recusada pelo administrador. Nada foi apagado. */
function RejectedNotice({ name }: { name: string | null }) {
  return (
    <div className="mx-auto max-w-lg rounded-card border border-red-500/20 bg-red-500/[0.04] p-8 text-center">
      <div className="mx-auto mb-5 grid size-12 place-items-center rounded-full bg-red-500/15">
        <UserX className="size-6 text-red-300" />
      </div>

      <h1 className="text-lg font-semibold">Acesso não liberado</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {name ? `${name}, seu ` : "Seu "}cadastro não foi aprovado. Se acha que isso é engano, fale
        com quem te convidou.
      </p>
    </div>
  );
}
