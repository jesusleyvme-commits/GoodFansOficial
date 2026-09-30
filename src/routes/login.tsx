import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/button";
import { Card, CardDescription, CardHeader, CardTitle, Label } from "@/components/card";
import { Feedback } from "@/components/feedback";
import { Input } from "@/components/input";
import { Logo } from "@/components/logo";
import { Spinner } from "@/components/spinner";
import { PASSWORD_MIN } from "@/lib/account-api";
import { supabase } from "@/lib/supabase";

import { hydrateAuth, useAuthSnapshot } from "@/lib/use-auth";
import { pageHead } from "@/lib/site-head";

export const Route = createFileRoute("/login")({
  ssr: false,
  component: LoginPage,
  head: () => pageHead({ title: "Entrar", path: "/login" }),
});

type Mode = "signin" | "signup" | "recover";

function LoginPage() {
  const navigate = useNavigate();
  const { session } = useAuthSnapshot();

  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(
    null,
  );

  useEffect(() => {
    void hydrateAuth().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready && session) void navigate({ to: "/dashboard", replace: true });
  }, [navigate, ready, session]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setFeedback(null);

    // O login é por e-mail real agora: a Meta confirma o endereço de verdade, e
    // é isso que permite recuperar a senha depois.
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setFeedback({ kind: "error", text: "Digite um e-mail válido." });
      setPending(false);
      return;
    }

    if (mode === "recover") {
      const { error } = await supabase().auth.resetPasswordForEmail(address, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      // A resposta é a mesma exista a conta ou não: revelar isso entregaria a
      // lista de e-mails cadastrados.
      setFeedback(
        error
          ? { kind: "error", text: error.message }
          : { kind: "success", text: "Se o e-mail existir, a recuperação chega em instantes." },
      );
      setPending(false);
      return;
    }

    if (mode === "signup" && password.length < PASSWORD_MIN) {
      setFeedback({
        kind: "error",
        text: `A senha precisa de pelo menos ${PASSWORD_MIN} caracteres.`,
      });
      setPending(false);
      return;
    }

    const credentials = { email: address, password };

    const { error } =
      mode === "signup"
        ? await supabase().auth.signUp(credentials)
        : await supabase().auth.signInWithPassword(credentials);

    if (error) {
      setFeedback({ kind: "error", text: error.message });
      setPending(false);
      return;
    }

    if (mode === "signup") {
      // Com confirmação de e-mail ligada, o GoTrue não cria sessão: a conta
      // só entra depois do clique no link que chega na caixa.
      setFeedback({
        kind: "success",
        text: "Conta criada. Confirme o e-mail que enviamos e depois entre.",
      });
      setMode("signin");
    }

    // No sucesso o listener de auth muda `session`, o que dispara o redirect acima.
  }

  if (!ready || session) {
    return (
      <div className="grid min-h-dvh place-items-center bg-gradient-brand-soft">
        <Spinner className="size-6 text-brand-400" />
      </div>
    );
  }

  const isSignUp = mode === "signup";
  const isRecover = mode === "recover";
  const emailOnly = isRecover;

  return (
    <div className="grid min-h-dvh place-items-center bg-gradient-brand-soft px-4 py-12">
      <div className="w-full max-w-sm">
        <Logo className="mx-auto mb-8 text-center text-4xl sm:text-5xl" />

        <Card className="animate-fade-in-scale">
          <CardHeader>
            <CardTitle>
              {isSignUp ? "Crie sua conta" : isRecover ? "Recuperar senha" : "Bem-vindo de volta"}
            </CardTitle>
            <CardDescription>
              {isSignUp
                ? "Uma conta para hospedar todos os links que você compartilha."
                : isRecover
                  ? "Enviamos um link com um código para você criar uma senha nova."
                  : "Entre para gerenciar seus links de entrega."}
            </CardDescription>
          </CardHeader>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@exemplo.com"
              />
            </div>

            {!emailOnly && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  required
                  minLength={PASSWORD_MIN}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                />
                {isSignUp && (
                  <p className="text-xs text-muted-foreground">
                    Mínimo de {PASSWORD_MIN} caracteres.
                  </p>
                )}
              </div>
            )}

            <Feedback feedback={feedback} />

            <Button type="submit" disabled={pending} className="w-full">
              {pending && <Spinner />}
              {isSignUp ? "Criar conta" : isRecover ? "Enviar link" : "Entrar"}
            </Button>
          </form>

          <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
            {isRecover ? (
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setFeedback(null);
                }}
                className="w-full cursor-pointer transition-colors hover:text-foreground"
              >
                Voltar para o login
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMode(isSignUp ? "signin" : "signup");
                    setFeedback(null);
                  }}
                  className="w-full cursor-pointer transition-colors hover:text-foreground"
                >
                  {isSignUp ? "Já tem uma conta? Entre" : "Ainda não tem conta? Crie uma"}
                </button>

                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("recover");
                      setFeedback(null);
                    }}
                    className="w-full cursor-pointer transition-colors hover:text-foreground"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
