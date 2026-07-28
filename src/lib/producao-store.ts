import { useSyncExternalStore } from "react";

export type Item = { id: string; nome: string };
export type Subitem = { id: string; item_id: string; nome: string };
export type Producao = {
  id: string;
  data: string; // YYYY-MM-DD
  item_id: string;
  subitem_id: string;
  quantidade: number;
};

export type DB = {
  itens: Item[];
  subitens: Subitem[];
  producao: Producao[];
};

const KEY = "controle-producao-v1";

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const seed = (): DB => {
  const mk = (nome: string, subs: string[]) => {
    const item: Item = { id: uid(), nome };
    return {
      item,
      subitens: subs.map((s) => ({ id: uid(), item_id: item.id, nome: s })),
    };
  };
  const grupos = [
    mk("Poste", ["10x20", "15x30", "30x40"]),
    mk("Viga", ["20x30", "25x40"]),
    mk("Meio Fio", ["Padrão", "Reforçado"]),
    mk("Bloco", ["9x19x39", "14x19x39"]),
  ];
  return {
    itens: grupos.map((g) => g.item),
    subitens: grupos.flatMap((g) => g.subitens),
    producao: [],
  };
};

const empty: DB = { itens: [], subitens: [], producao: [] };

let db: DB = empty;
let loaded = false;
const listeners = new Set<() => void>();

function load(): DB {
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      window.localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    const parsed = JSON.parse(raw) as DB;
    return {
      itens: parsed.itens ?? [],
      subitens: parsed.subitens ?? [],
      producao: parsed.producao ?? [],
    };
  } catch {
    return empty;
  }
}

function ensure() {
  if (!loaded && typeof window !== "undefined") {
    db = load();
    loaded = true;
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function setDB(next: DB) {
  db = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }
  emit();
}

function subscribe(cb: () => void) {
  ensure();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useDB(): DB {
  return useSyncExternalStore(
    subscribe,
    () => {
      ensure();
      return db;
    },
    () => empty,
  );
}

/* ---------- Itens ---------- */
export function addItem(nome: string) {
  setDB({ ...db, itens: [...db.itens, { id: uid(), nome: nome.trim() }] });
}
export function updateItem(id: string, nome: string) {
  setDB({ ...db, itens: db.itens.map((i) => (i.id === id ? { ...i, nome: nome.trim() } : i)) });
}
export function deleteItem(id: string) {
  setDB({
    itens: db.itens.filter((i) => i.id !== id),
    subitens: db.subitens.filter((s) => s.item_id !== id),
    producao: db.producao.filter((p) => p.item_id !== id),
  });
}

/* ---------- Subitens ---------- */
export function addSubitem(item_id: string, nome: string) {
  setDB({ ...db, subitens: [...db.subitens, { id: uid(), item_id, nome: nome.trim() }] });
}
export function updateSubitem(id: string, nome: string) {
  setDB({
    ...db,
    subitens: db.subitens.map((s) => (s.id === id ? { ...s, nome: nome.trim() } : s)),
  });
}
export function deleteSubitem(id: string) {
  setDB({
    ...db,
    subitens: db.subitens.filter((s) => s.id !== id),
    producao: db.producao.filter((p) => p.subiten_id_hack !== undefined ? true : p.subitem_id !== id),
  });
}

/* ---------- Produção ---------- */
export function registrar(
  data: string,
  entradas: { item_id: string; subitem_id: string; quantidade: number }[],
) {
  let producao = [...db.producao];
  for (const e of entradas) {
    if (e.quantidade === 0) continue;
    const idx = producao.findIndex(
      (p) => p.data === data && p.subitem_id === e.subitem_id,
    );
    if (idx >= 0) {
      producao[idx] = { ...producao[idx], quantidade: producao[idx].quantidade + e.quantidade };
    } else {
      producao.push({ id: uid(), data, ...e });
    }
  }
  producao = producao.filter((p) => p.quantidade > 0);
  setDB({ ...db, producao });
}

export function setQuantidade(id: string, quantidade: number) {
  setDB({
    ...db,
    producao: db.producao
      .map((p) => (p.id === id ? { ...p, quantidade } : p))
      .filter((p) => p.quantidade > 0),
  });
}

export function deleteProducao(id: string) {
  setDB({ ...db, producao: db.producao.filter((p) => p.id !== id) });
}

/* ---------- Datas ---------- */
export const hojeISO = () => toISO(new Date());

export function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
