import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setEscopo } from "./producao-store";

export type Usuario = {
  id: string;
  nome: string;
  email: string;
};

type Estado = { atual: Usuario | null; pronto: boolean };

const vazio: Estado = { atual: null, pronto: false };
let estado: Estado = vazio;
let iniciado = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setEstado(next: Estado) {
  estado = next;
  emit();
}

async function aplicarSessao(user: { id: string; email?: string | null } | null) {
  if (!user) {
    setEstado({ atual: null, pronto: true });
    void setEscopo(null);
    return;
  }
  const anterior = estado.atual;
  setEstado({
    atual: { id: user.id, nome: anterior?.nome ?? "", email: user.email ?? "" },
    pronto: true,
  });
  void setEscopo(user.id);
  const { data } = await supabase.from("profiles").select("nome").eq("id", user.id).maybeSingle();
  if (estado.atual?.id === user.id) {
    setEstado({
      atual: { id: user.id, nome: data?.nome || (user.email ?? "").split("@")[0], email: user.email ?? "" },
      pronto: true,
    });
  }
}

function iniciar() {
  if (iniciado || typeof window === "undefined") return;
  iniciado = true;
  supabase.auth.onAuthStateChange((_evento, sessao) => {
    void aplicarSessao(sessao?.user ?? null);
  });
  void supabase.auth.getSession().then(({ data }) => {
    void aplicarSessao(data.session?.user ?? null);
  });
}

function subscribe(cb: () => void) {
  iniciar();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useAuth(): Estado {
  return useSyncExternalStore(
    subscribe,
    () => estado,
    () => vazio,
  );
}

function traduzir(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha inválidos.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Já existe uma conta com esse e-mail.";
  if (m.includes("password")) return "A senha precisa ter ao menos 6 caracteres.";
  if (m.includes("email")) return "Informe um e-mail válido.";
  return msg;
}

export async function cadastrar(
  nome: string,
  email: string,
  senha: string,
): Promise<string | null> {
  if (!nome.trim()) return "Informe seu nome completo.";
  if (!email.includes("@")) return "Informe um e-mail válido.";
  if (senha.length < 6) return "A senha precisa ter ao menos 6 caracteres.";
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password: senha,
    options: {
      emailRedirectTo: window.location.origin,
      data: { nome: nome.trim() },
    },
  });
  if (error) return traduzir(error.message);
  if (data.user) {
    await supabase.from("profiles").upsert({ id: data.user.id, nome: nome.trim() });
    setEstado({
      atual: { id: data.user.id, nome: nome.trim(), email: data.user.email ?? "" },
      pronto: true,
    });
  }
  return null;
}

export async function entrar(email: string, senha: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: senha,
  });
  if (error) return traduzir(error.message);
  return null;
}

export async function sair() {
  await supabase.auth.signOut();
  setEstado({ atual: null, pronto: true });
  void setEscopo(null);
}

export function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] ?? nome;
}
