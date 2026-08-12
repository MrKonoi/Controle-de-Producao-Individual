import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Item = { id: string; nome: string; arquivado?: boolean };
export type Subitem = {
  id: string;
  item_id: string;
  nome: string;
  valor?: number; // valor unitário em R$
  arquivado?: boolean;
};
export type Producao = {
  id: string;
  data: string; // YYYY-MM-DD
  item_id: string;
  subitem_id: string;
  item_nome: string;
  subitem_nome: string;
  quantidade: number;
  valor_unit?: number; // valor unitário no momento do registro
  observacao?: string;
  foto?: string; // dataURL
};

export type DB = {
  itens: Item[];
  subitens: Subitem[];
  producao: Producao[];
  carregando: boolean;
};

const LEGACY_KEY = "controle-producao-v1";
const CACHE_KEY = "controle-producao-cache-v2";
const MIGRADO_KEY = "controle-producao-migrado-v2";

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const empty: DB = { itens: [], subitens: [], producao: [], carregando: false };

let db: DB = empty;
let userId: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function cacheKey() {
  return `${CACHE_KEY}:${userId}`;
}

function salvarCache() {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(
      cacheKey(),
      JSON.stringify({ itens: db.itens, subitens: db.subitens, producao: db.producao }),
    );
  } catch {
    // cache cheio (fotos): segue apenas na nuvem
  }
}

function setDB(next: DB, persistir = true) {
  db = next;
  if (persistir) salvarCache();
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useDB(): DB {
  return useSyncExternalStore(
    subscribe,
    () => db,
    () => empty,
  );
}

/* ---------- Sincronização com a nuvem ---------- */

const SEED = [
  { nome: "Poste", subs: ["10x20", "15x30", "30x40"] },
  { nome: "Viga", subs: ["20x30", "25x40"] },
  { nome: "Meio Fio", subs: ["Padrão", "Reforçado"] },
  { nome: "Bloco", subs: ["9x19x39", "14x19x39"] },
];

type Local = { itens: Item[]; subitens: Subitem[]; producao: Producao[] };

/** Procura dados antigos guardados neste aparelho (versões anteriores do app). */
function dadosLocaisAntigos(): Local | null {
  if (typeof window === "undefined") return null;
  let melhor: Local | null = null;
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (!k || !k.startsWith(LEGACY_KEY)) continue;
    try {
      const v = JSON.parse(window.localStorage.getItem(k) ?? "") as Local;
      if (!v?.itens) continue;
      const peso = (v.producao?.length ?? 0) * 100 + (v.itens?.length ?? 0);
      const pesoAtual = melhor ? (melhor.producao?.length ?? 0) * 100 + melhor.itens.length : -1;
      if (peso > pesoAtual) melhor = v;
    } catch {
      // ignora entradas inválidas
    }
  }
  return melhor;
}

function lerCache(): Local | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    return JSON.parse(window.localStorage.getItem(cacheKey()) ?? "") as Local;
  } catch {
    return null;
  }
}

/** Define o usuário dono dos dados e carrega tudo da nuvem. */
export async function setEscopo(id: string | null) {
  if (userId === id) return;
  userId = id;
  if (!id) {
    setDB(empty, false);
    return;
  }
  const cache = lerCache();
  setDB(
    {
      itens: cache?.itens ?? [],
      subitens: cache?.subitens ?? [],
      producao: cache?.producao ?? [],
      carregando: true,
    },
    false,
  );
  await sincronizar();
}

export async function sincronizar() {
  if (!userId) return;
  const [itensRes, subRes, prodRes] = await Promise.all([
    supabase.from("itens").select("*").order("created_at"),
    supabase.from("subitens").select("*").order("created_at"),
    supabase.from("producao").select("*").order("data"),
  ]);
  if (itensRes.error || subRes.error || prodRes.error) {
    console.error(itensRes.error ?? subRes.error ?? prodRes.error);
    setDB({ ...db, carregando: false }, false);
    return;
  }

  const itens: Item[] = (itensRes.data ?? []).map((i) => ({
    id: i.id,
    nome: i.nome,
    arquivado: i.arquivado ?? false,
  }));
  const subitens: Subitem[] = (subRes.data ?? []).map((s) => ({
    id: s.id,
    item_id: s.item_id,
    nome: s.nome,
    valor: s.valor == null ? undefined : Number(s.valor),
    arquivado: s.arquivado ?? false,
  }));
  const producao: Producao[] = (prodRes.data ?? []).map((p) => ({
    id: p.id,
    data: p.data,
    item_id: p.item_id,
    subitem_id: p.subitem_id,
    item_nome: p.item_nome,
    subitem_nome: p.subitem_nome,
    quantidade: p.quantidade,
    valor_unit: p.valor_unit == null ? undefined : Number(p.valor_unit),
    observacao: p.observacao ?? undefined,
    foto: p.foto ?? undefined,
  }));

  setDB({ itens, subitens, producao, carregando: false });

  if (itens.length === 0) await primeiraCarga();
}

/** Conta nova: envia o que já existia no aparelho ou cria os itens de exemplo. */
async function primeiraCarga() {
  if (!userId) return;
  const jaMigrou =
    typeof window !== "undefined" && window.localStorage.getItem(`${MIGRADO_KEY}:${userId}`);
  const local = jaMigrou ? null : dadosLocaisAntigos();

  const itens: Item[] = [];
  const subitens: Subitem[] = [];
  const producao: Producao[] = [];

  if (local && local.itens.length > 0) {
    const mapaItem = new Map<string, string>();
    const mapaSub = new Map<string, string>();
    for (const i of local.itens) {
      const novo = uid();
      mapaItem.set(i.id, novo);
      itens.push({ id: novo, nome: i.nome, arquivado: i.arquivado ?? false });
    }
    for (const s of local.subitens) {
      const item_id = mapaItem.get(s.item_id);
      if (!item_id) continue;
      const novo = uid();
      mapaSub.set(s.id, novo);
      subitens.push({ id: novo, item_id, nome: s.nome, valor: s.valor, arquivado: s.arquivado ?? false });
    }
    for (const p of local.producao ?? []) {
      const item_id = mapaItem.get(p.item_id);
      const subitem_id = mapaSub.get(p.subitem_id);
      if (!item_id || !subitem_id) continue;
      producao.push({ ...p, id: uid(), item_id, subitem_id });
    }
  } else {
    for (const g of SEED) {
      const item: Item = { id: uid(), nome: g.nome, arquivado: false };
      itens.push(item);
      for (const nome of g.subs) subitens.push({ id: uid(), item_id: item.id, nome });
    }
  }

  const linhasItens = itens.map((i) => ({ ...i, user_id: userId!, arquivado: !!i.arquivado }));
  const linhasSubs = subitens.map((s) => ({
    id: s.id,
    user_id: userId!,
    item_id: s.item_id,
    nome: s.nome,
    valor: s.valor ?? null,
    arquivado: !!s.arquivado,
  }));
  const linhasProd = producao.map((p) => ({ ...p, user_id: userId! }));

  const r1 = await supabase.from("itens").insert(linhasItens);
  if (r1.error) return console.error(r1.error);
  if (linhasSubs.length) {
    const r2 = await supabase.from("subitens").insert(linhasSubs);
    if (r2.error) return console.error(r2.error);
  }
  if (linhasProd.length) {
    const r3 = await supabase.from("producao").insert(linhasProd);
    if (r3.error) console.error(r3.error);
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem(`${MIGRADO_KEY}:${userId}`, "1");
  }
  setDB({ itens, subitens, producao, carregando: false });
}

function erro(e: unknown) {
  if (e) console.error(e);
}

/* ---------- Itens ---------- */
export function addItem(nome: string) {
  if (!userId) return;
  const item: Item = { id: uid(), nome: nome.trim(), arquivado: false };
  setDB({ ...db, itens: [...db.itens, item] });
  void supabase
    .from("itens")
    .insert({ id: item.id, user_id: userId, nome: item.nome })
    .then(({ error }) => erro(error));
}
export function updateItem(id: string, nome: string) {
  const novo = nome.trim();
  setDB({ ...db, itens: db.itens.map((i) => (i.id === id ? { ...i, nome: novo } : i)) });
  void supabase
    .from("itens")
    .update({ nome: novo })
    .eq("id", id)
    .then(({ error }) => erro(error));
}
export function arquivarItem(id: string) {
  setDB({
    ...db,
    itens: db.itens.map((i) => (i.id === id ? { ...i, arquivado: true } : i)),
    subitens: db.subitens.map((s) => (s.item_id === id ? { ...s, arquivado: true } : s)),
  });
  void supabase
    .from("itens")
    .update({ arquivado: true })
    .eq("id", id)
    .then(({ error }) => erro(error));
  void supabase
    .from("subitens")
    .update({ arquivado: true })
    .eq("item_id", id)
    .then(({ error }) => erro(error));
}
export function restaurarItem(id: string) {
  setDB({ ...db, itens: db.itens.map((i) => (i.id === id ? { ...i, arquivado: false } : i)) });
  void supabase
    .from("itens")
    .update({ arquivado: false })
    .eq("id", id)
    .then(({ error }) => erro(error));
}

/* ---------- Subitens ---------- */
export function addSubitem(item_id: string, nome: string) {
  if (!userId) return;
  const sub: Subitem = { id: uid(), item_id, nome: nome.trim(), arquivado: false };
  setDB({ ...db, subitens: [...db.subitens, sub] });
  void supabase
    .from("subitens")
    .insert({ id: sub.id, user_id: userId, item_id, nome: sub.nome })
    .then(({ error }) => erro(error));
}
export function updateSubitem(id: string, nome: string) {
  const novo = nome.trim();
  setDB({ ...db, subitens: db.subitens.map((s) => (s.id === id ? { ...s, nome: novo } : s)) });
  void supabase
    .from("subitens")
    .update({ nome: novo })
    .eq("id", id)
    .then(({ error }) => erro(error));
}
export function setValorSubitem(id: string, valor: number | undefined) {
  const v = valor && valor > 0 ? valor : undefined;
  setDB({
    ...db,
    subitens: db.subitens.map((s) => (s.id === id ? { ...s, valor: v } : s)),
  });
  void supabase
    .from("subitens")
    .update({ valor: v ?? null })
    .eq("id", id)
    .then(({ error }) => erro(error));
}
export function arquivarSubitem(id: string) {
  setDB({
    ...db,
    subitens: db.subitens.map((s) => (s.id === id ? { ...s, arquivado: true } : s)),
  });
  void supabase
    .from("subitens")
    .update({ arquivado: true })
    .eq("id", id)
    .then(({ error }) => erro(error));
}
export function restaurarSubitem(id: string) {
  setDB({
    ...db,
    subitens: db.subitens.map((s) => (s.id === id ? { ...s, arquivado: false } : s)),
  });
  void supabase
    .from("subitens")
    .update({ arquivado: false })
    .eq("id", id)
    .then(({ error }) => erro(error));
}

/* ---------- Produção ---------- */
export function registrar(
  data: string,
  entradas: { item_id: string; subitem_id: string; quantidade: number }[],
  extras?: { observacao?: string; foto?: string },
) {
  if (!userId) return;
  let producao = [...db.producao];
  const paraInserir: Producao[] = [];
  const paraAtualizar: Producao[] = [];

  for (const e of entradas) {
    if (e.quantidade === 0) continue;
    const item_nome = db.itens.find((i) => i.id === e.item_id)?.nome ?? "Item removido";
    const sub = db.subitens.find((s) => s.id === e.subitem_id);
    const subitem_nome = sub?.nome ?? "Medida removida";
    const idx = producao.findIndex((p) => p.data === data && p.subitem_id === e.subitem_id);
    if (idx >= 0) {
      const atual = producao[idx];
      const novo: Producao = {
        ...atual,
        quantidade: atual.quantidade + e.quantidade,
        item_nome,
        subitem_nome,
        valor_unit: sub?.valor ?? atual.valor_unit,
        observacao: extras?.observacao || atual.observacao,
        foto: extras?.foto || atual.foto,
      };
      producao[idx] = novo;
      paraAtualizar.push(novo);
    } else {
      const novo: Producao = {
        id: uid(),
        data,
        ...e,
        item_nome,
        subitem_nome,
        valor_unit: sub?.valor,
        observacao: extras?.observacao || undefined,
        foto: extras?.foto || undefined,
      };
      producao.push(novo);
      paraInserir.push(novo);
    }
  }

  const removidos = producao.filter((p) => p.quantidade <= 0).map((p) => p.id);
  producao = producao.filter((p) => p.quantidade > 0);
  setDB({ ...db, producao });

  if (paraInserir.length) {
    void supabase
      .from("producao")
      .insert(paraInserir.map((p) => ({ ...p, user_id: userId! })))
      .then(({ error }) => erro(error));
  }
  for (const p of paraAtualizar) {
    void supabase
      .from("producao")
      .update({
        quantidade: p.quantidade,
        item_nome: p.item_nome,
        subitem_nome: p.subitem_nome,
        valor_unit: p.valor_unit ?? null,
        observacao: p.observacao ?? null,
        foto: p.foto ?? null,
      })
      .eq("id", p.id)
      .then(({ error }) => erro(error));
  }
  if (removidos.length) {
    void supabase
      .from("producao")
      .delete()
      .in("id", removidos)
      .then(({ error }) => erro(error));
  }
}

export function setQuantidade(id: string, quantidade: number) {
  if (quantidade <= 0) return deleteProducao(id);
  setDB({
    ...db,
    producao: db.producao.map((p) => (p.id === id ? { ...p, quantidade } : p)),
  });
  void supabase
    .from("producao")
    .update({ quantidade })
    .eq("id", id)
    .then(({ error }) => erro(error));
}

export function setObservacao(id: string, observacao: string) {
  const v = observacao.trim() || undefined;
  setDB({
    ...db,
    producao: db.producao.map((p) => (p.id === id ? { ...p, observacao: v } : p)),
  });
  void supabase
    .from("producao")
    .update({ observacao: v ?? null })
    .eq("id", id)
    .then(({ error }) => erro(error));
}

export function removerFoto(id: string) {
  setDB({
    ...db,
    producao: db.producao.map((p) => (p.id === id ? { ...p, foto: undefined } : p)),
  });
  void supabase
    .from("producao")
    .update({ foto: null })
    .eq("id", id)
    .then(({ error }) => erro(error));
}

export function deleteProducao(id: string) {
  setDB({ ...db, producao: db.producao.filter((p) => p.id !== id) });
  void supabase
    .from("producao")
    .delete()
    .eq("id", id)
    .then(({ error }) => erro(error));
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

/* ---------- Valores ---------- */
export function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function valorRegistro(p: Producao) {
  return (p.valor_unit ?? 0) * p.quantidade;
}

export function somaValor(registros: Producao[]) {
  return registros.reduce((s, p) => s + valorRegistro(p), 0);
}
