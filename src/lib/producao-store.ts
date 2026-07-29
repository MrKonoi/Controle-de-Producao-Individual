import { useSyncExternalStore } from "react";

export type Item = { id: string; nome: string; arquivado?: boolean };
export type Subitem = { id: string; item_id: string; nome: string; arquivado?: boolean };
export type Producao = {
  id: string;
  data: string; // YYYY-MM-DD
  item_id: string;
  subitem_id: string;
  item_nome: string;
  subitem_nome: string;
  quantidade: number;
  observacao?: string;
  foto?: string; // dataURL
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

/** Preenche nomes em registros antigos, uma única vez. */
function migrar(raw: DB): DB {
  const itens = raw.itens ?? [];
  const subitens = raw.subitens ?? [];
  const producao = (raw.producao ?? []).map((p) => ({
    ...p,
    item_nome: p.item_nome || itens.find((i) => i.id === p.item_id)?.nome || "Item removido",
    subitem_nome:
      p.subitem_nome || subitens.find((s) => s.id === p.subitem_id)?.nome || "Medida removida",
  }));
  return { itens, subitens, producao };
}

function load(): DB {
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      window.localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    const migrado = migrar(JSON.parse(raw) as DB);
    window.localStorage.setItem(KEY, JSON.stringify(migrado));
    return migrado;
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
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // armazenamento cheio (fotos): mantém em memória
    }
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
export function arquivarItem(id: string) {
  setDB({
    ...db,
    itens: db.itens.map((i) => (i.id === id ? { ...i, arquivado: true } : i)),
    subitens: db.subitens.map((s) => (s.item_id === id ? { ...s, arquivado: true } : s)),
  });
}
export function restaurarItem(id: string) {
  setDB({ ...db, itens: db.itens.map((i) => (i.id === id ? { ...i, arquivado: false } : i)) });
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
export function arquivarSubitem(id: string) {
  setDB({
    ...db,
    subitens: db.subitens.map((s) => (s.id === id ? { ...s, arquivado: true } : s)),
  });
}
export function restaurarSubitem(id: string) {
  setDB({
    ...db,
    subitens: db.subitens.map((s) => (s.id === id ? { ...s, arquivado: false } : s)),
  });
}

/* ---------- Produção ---------- */
export function registrar(
  data: string,
  entradas: { item_id: string; subitem_id: string; quantidade: number }[],
  extras?: { observacao?: string; foto?: string },
) {
  let producao = [...db.producao];
  for (const e of entradas) {
    if (e.quantidade === 0) continue;
    const item_nome = db.itens.find((i) => i.id === e.item_id)?.nome ?? "Item removido";
    const subitem_nome =
      db.subitens.find((s) => s.id === e.subitem_id)?.nome ?? "Medida removida";
    const idx = producao.findIndex((p) => p.data === data && p.subitem_id === e.subitem_id);
    if (idx >= 0) {
      producao[idx] = {
        ...producao[idx],
        quantidade: producao[idx].quantidade + e.quantidade,
        item_nome,
        subitem_nome,
        observacao: extras?.observacao || producao[idx].observacao,
        foto: extras?.foto || producao[idx].foto,
      };
    } else {
      producao.push({
        id: uid(),
        data,
        ...e,
        item_nome,
        subitem_nome,
        observacao: extras?.observacao || undefined,
        foto: extras?.foto || undefined,
      });
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

export function setObservacao(id: string, observacao: string) {
  setDB({
    ...db,
    producao: db.producao.map((p) =>
      p.id === id ? { ...p, observacao: observacao.trim() || undefined } : p,
    ),
  });
}

export function removerFoto(id: string) {
  setDB({
    ...db,
    producao: db.producao.map((p) => (p.id === id ? { ...p, foto: undefined } : p)),
  });
}

export function deleteProducao(id: string) {
  setDB({ ...db, producao: db.producao.filter((p) => p.id !== id) });
}

/* ---------- Foto ---------- */
export function comprimirImagem(file: File, max = 1000, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler a imagem"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Falha ao abrir a imagem"));
      img.onload = () => {
        const escala = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas indisponível"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
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
