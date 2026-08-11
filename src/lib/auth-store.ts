import { useSyncExternalStore } from "react";
import { setEscopo } from "./producao-store";

export type Usuario = {
  id: string;
  nome: string;
  usuario: string; // login (normalizado, minúsculo)
  senha: string; // simples, sem dados sensíveis
};

const USERS_KEY = "controle-producao-usuarios-v1";
const SESSION_KEY = "controle-producao-sessao-v1";

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const norm = (u: string) => u.trim().toLowerCase();

type Estado = { usuarios: Usuario[]; atual: Usuario | null; pronto: boolean };

const vazio: Estado = { usuarios: [], atual: null, pronto: false };
let estado: Estado = vazio;
let carregado = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persistir() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USERS_KEY, JSON.stringify(estado.usuarios));
  if (estado.atual) window.localStorage.setItem(SESSION_KEY, estado.atual.id);
  else window.localStorage.removeItem(SESSION_KEY);
}

function carregar() {
  if (carregado || typeof window === "undefined") return;
  carregado = true;
  let usuarios: Usuario[] = [];
  try {
    usuarios = JSON.parse(window.localStorage.getItem(USERS_KEY) ?? "[]") as Usuario[];
  } catch {
    usuarios = [];
  }
  const id = window.localStorage.getItem(SESSION_KEY);
  const atual = usuarios.find((u) => u.id === id) ?? null;
  estado = { usuarios, atual, pronto: true };
  setEscopo(atual?.id ?? null);
}

function subscribe(cb: () => void) {
  carregar();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useAuth(): Estado {
  return useSyncExternalStore(
    subscribe,
    () => {
      carregar();
      return estado;
    },
    () => vazio,
  );
}

export function cadastrar(nome: string, usuario: string, senha: string): string | null {
  carregar();
  const login = norm(usuario);
  if (!nome.trim()) return "Informe seu nome completo.";
  if (login.length < 3) return "O nome de usuário precisa ter ao menos 3 caracteres.";
  if (senha.length < 4) return "A senha precisa ter ao menos 4 caracteres.";
  if (estado.usuarios.some((u) => u.usuario === login)) return "Esse usuário já existe.";
  const novo: Usuario = { id: uid(), nome: nome.trim(), usuario: login, senha };
  estado = { ...estado, usuarios: [...estado.usuarios, novo], atual: novo };
  persistir();
  setEscopo(novo.id);
  emit();
  return null;
}

export function entrar(usuario: string, senha: string): string | null {
  carregar();
  const login = norm(usuario);
  const achado = estado.usuarios.find((u) => u.usuario === login && u.senha === senha);
  if (!achado) return "Usuário ou senha inválidos.";
  estado = { ...estado, atual: achado };
  persistir();
  setEscopo(achado.id);
  emit();
  return null;
}

export function sair() {
  carregar();
  estado = { ...estado, atual: null };
  persistir();
  setEscopo(null);
  emit();
}

export function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] ?? nome;
}
