import { useSyncExternalStore } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

/** Instantâneo em cache para os componentes lerem o estado de auth sem rede. */
let snapshot: { session: Session | null; user: User | null } = {
  session: null,
  user: null,
};

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

supabase().auth.onAuthStateChange((_event, session) => {
  snapshot = { session, user: session?.user ?? null };
  emit();
});

export function getAuthSnapshot() {
  return snapshot;
}

/**
 * JWT da sessão atual, para as server fns conferirem quem está chamando.
 * A sessão vive no localStorage, então ele precisa ser repassado à mão.
 */
export async function currentAccessToken(): Promise<string> {
  const { data } = await supabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre de novo.");
  return token;
}

/** Lê a sessão persistida do localStorage uma única vez, no primeiro acesso. */
export async function hydrateAuth(): Promise<Session | null> {
  if (snapshot.session) return snapshot.session;

  const { data } = await supabase().auth.getSession();
  snapshot = { session: data.session, user: data.session?.user ?? null };
  emit();

  return snapshot.session;
}

export function subscribeAuth(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAuthSnapshot() {
  return useSyncExternalStore(subscribeAuth, getAuthSnapshot, getAuthSnapshot);
}
