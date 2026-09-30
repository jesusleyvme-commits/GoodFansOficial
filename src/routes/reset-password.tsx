import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/button";
import { Card, CardDescription, CardHeader, CardTitle, Label } from "@/components/card";
import { Feedback } from "@/components/feedback";
import { Input } from "@/components/input";
import { Logo } from "@/components/logo";
import { Spinner } from "@/components/spinner";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/account-api";
import { supabase } from "@/lib/supabase";
import { hydrateAuth, useAuthSnapshot } from "@/lib/use-auth";
import { pageHead } from "@/lib/site-head";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPasswordPage,
  head: () => pageHead({ title: "Recuperar senha", path: "/reset-password" }),
});

/**
 * Chega aqui pelo link do e-mail. O GoTrue entrega a sessão no fragmento da URL,
 * então o trabalho é transformá-la numa senha nova antes que o link expire.
 */
function ResetPasswordPage() {
  const navigate = useNavigate();
  const { session } = useAuthSnapshot();

  const [ready, setReady] = useState(false);
  const [hasRecovery, setHasRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(
    null,
  );

  const check = useCallback(async () => {
    const { data } = await supabase().auth.getSession();
    setHasRecovery(Boolean(data.session));
  }, []);

  useEffect(() => {
    void hydrateAuth()
      .then(check)
      .finally(() => setReady(true));
  }, [check]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    if (password.length < PASSWORD_MIN) {
      setFeedback({
        kind: "error",
        text: `A senha precisa de pelo menos ${PASSWORD_MIN} caracteres.`,
      });
      return;
    }
    if (password.length > PASSWORD_MAX) {
      setFeedback({
        kind: "error",
        text: `A senha pode ter no máximo ${PASSWORD_MAX} caracteres.`,
      });
      return;
    }
    if (password !== confirm) {
      setFeedback({ kind: "error", text: "As duas senhas não são iguais." });
      return;
    }

    setPending(true);
    setFeedback(null);

    try {
      const { error } = await supabase().auth.updateUser({ password });
      if (error) throw new Error(error.message);
      setFeedback({ kind: "success", text: "Senha trocada. Entrando..." });
      void navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Não foi possível trocar a senha.",
      });
      setPending(false);
    }
  }

  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center bg-gradient-brand-soft">
        <Spinner className="size-6 text-brand-400" />
      </div>
    );
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-gradient-brand-soft px-4 py-12">
      <div className="w-full max-w-sm">
        <Logo className="mx-auto mb-8 text-center text-4xl sm:text-5xl" />

        <Card className="animate-fade-in-scale">
          <CardHeader>
            <CardTitle>Crie uma senha nova</CardTitle>
            <CardDescription>
              {hasRecovery
                ? "Depois de salvar você entra direto no painel."
                : "Este link já foi usado ou expirado. Peça um novo na tela de login."}
            </CardDescription>
          </CardHeader>

          {hasRecovery && (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Senha nova</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={PASSWORD_MIN}
                  maxLength={PASSWORD_MAX}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Repita a senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={PASSWORD_MIN}
                  maxLength={PASSWORD_MAX}
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <Feedback feedback={feedback} />

              <Button type="submit" disabled={pending} className="w-full">
                {pending && <Spinner />}
                Salvar senha
              </Button>
            </form>
          )}

          {!hasRecovery && <Feedback feedback={feedback} />}

          <Button
            type="button"
            variant="ghost"
            className="mt-6 w-full"
            onClick={() => void navigate({ to: "/login", replace: true })}
          >
            Voltar para o login
          </Button>
        </Card>
      </div>
    </div>
  );
}
