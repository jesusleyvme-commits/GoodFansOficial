import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, AtSign, KeyRound, Mail, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/button";
import { EmailForm } from "@/components/email-form";
import { PasswordForm } from "@/components/password-form";
import { ProfileForm } from "@/components/profile-form";
import { SettingsCard } from "@/components/settings-parts";
import { SettingsNav, type SettingsSection } from "@/components/settings-nav";
import { Spinner } from "@/components/spinner";
import { UsernameForm } from "@/components/username-form";
import { getCurrentUsername } from "@/lib/account-api";
import type { Profile } from "@/lib/database.types";
import { getProfile } from "@/lib/profile-api";
import { supabase } from "@/lib/supabase";
import { pageHead } from "@/lib/site-head";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
  head: () => pageHead({ title: "Configurações", path: "/dashboard/settings" }),
});

type AccountData = {
  profile: Profile | null;
  username: string;
  email: string;
};

const SECTIONS = [
  { id: "perfil", label: "Perfil" },
  { id: "email", label: "E-mail" },
  { id: "usuario", label: "Usuário" },
  { id: "senha", label: "Senha" },
] as const satisfies readonly SettingsSection[];

function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AccountData>({ profile: null, username: "", email: "" });
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  // Uma função só para todas as seções: qualquer troca re-lê o perfil e a sessão,
  // então o menu e os formulários nunca divergem do que está no banco.
  const load = useCallback(async () => {
    try {
      const [profile, username, session] = await Promise.all([
        getProfile(),
        getCurrentUsername(),
        supabase().auth.getSession(),
      ]);
      setData({ profile, username, email: session.data.session?.user.email ?? "" });
    } catch {
      setData({ profile: null, username: "", email: "" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Abre direto na seção do link compartilhado, por exemplo /dashboard/settings#senha.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (SECTIONS.some((section) => section.id === hash)) setActive(hash);
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard" aria-label="Voltar para o painel">
            <ArrowLeft />
          </Link>
        </Button>

        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">Configurações</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Como você aparece e com o que você entra.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Spinner className="size-5 text-brand-400" />
        </div>
      ) : (
        <>
          <div className="sticky top-16 z-20 -mx-4 bg-gradient-brand-soft/90 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-input sm:px-3">
            <SettingsNav sections={SECTIONS} active={active} onActiveChange={setActive} />
          </div>

          <div className="space-y-5">
            <SettingsCard
              id="perfil"
              title="Perfil"
              description="Seu nome visível e a foto que aparecem para os outros."
              icon={<User className="size-4" />}
              active={active === "perfil"}
            >
              <ProfileForm
                displayName={data.profile?.display_name ?? ""}
                avatarPath={data.profile?.avatar_path ?? null}
                onSaved={load}
              />
            </SettingsCard>

            <SettingsCard
              id="email"
              title="E-mail"
              description="O endereço com que você entra na conta."
              icon={<Mail className="size-4" />}
              active={active === "email"}
            >
              <EmailForm email={data.email} onChanged={load} />
            </SettingsCard>

            <SettingsCard
              id="usuario"
              title="Usuário"
              description="O nome curto que identifica você dentro do GoodFans."
              icon={<AtSign className="size-4" />}
              active={active === "usuario"}
            >
              <UsernameForm username={data.username} onChanged={load} />
            </SettingsCard>

            <SettingsCard
              id="senha"
              title="Senha"
              description="A senha que protege o seu login."
              icon={<KeyRound className="size-4" />}
              active={active === "senha"}
            >
              <PasswordForm />
            </SettingsCard>
          </div>
        </>
      )}
    </div>
  );
}
