import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Texto de um erro desconhecido, com um texto para quando não há erro nenhum.
 *
 * O padrão `error instanceof Error ? error.message : "..."` estava repetido em
 * vinte lugares, e cada cópia era uma chance de a pessoa ver `[object Object]`
 * ou uma tela em branco no lugar de uma frase que diz o que aconteceu.
 */
export function errorText(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}

/**
 * O erro é "você não tem permissão", e não "algo quebrou".
 *
 * O PostgREST representa a mesma recusa de três jeitos dependendo de onde ela
 * acontece: erro 42512 ou 42501 vindo do banco, 401/403 na resposta HTTP, ou
 * `permission denied` no texto. Sem os três, uma negação de permissão passa por
 * falha genérica — que é como alguém descobre que não é admin só depois de
 * tentar arrumar um problema que não existe.
 */
export function isPermissionDenied(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  const { code, message } = error as { code?: unknown; message?: unknown };

  if (code === "42501" || code === "42512" || code === "401" || code === "403") return true;
  if (code === "PGRST" && typeof message === "string")
    return /permission|not authorized/i.test(message);

  return (
    typeof message === "string" &&
    /permission denied|not authorized|Só o administrador/i.test(message)
  );
}
