import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Camera, Minus, Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  useDB,
  registrar,
  hojeISO,
  formatBR,
  formatBRL,
  comprimirImagem,
} from "@/lib/producao-store";

export const Route = createFileRoute("/item/$itemId")({
  component: ItemPage,
  validateSearch: (search: Record<string, unknown>) => ({
    data: typeof search.data === "string" ? search.data : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Registrar produção do item" },
      {
        name: "description",
        content: "Some as quantidades por medida e registre a produção do dia.",
      },
      { property: "og:title", content: "Registrar produção do item" },
      {
        property: "og:description",
        content: "Some as quantidades por medida e registre a produção do dia.",
      },
    ],
  }),
});

function ItemPage() {
  const { itemId } = Route.useParams();
  const { data } = Route.useSearch();
  const dia = data ?? hojeISO();
  const db = useDB();
  const navigate = useNavigate();
  const [qtds, setQtds] = useState<Record<string, number>>({});
  const [confirmando, setConfirmando] = useState(false);
  const [observacao, setObservacao] = useState("");
  const [foto, setFoto] = useState<string | undefined>();
  const inputFoto = useRef<HTMLInputElement>(null);

  const item = db.itens.find((i) => i.id === itemId);
  const subitens = db.subitens.filter((s) => s.item_id === itemId && !s.arquivado);
  const total = Object.values(qtds).reduce((s, n) => s + n, 0);
  const totalValor = subitens.reduce(
    (s, sub) => s + (sub.valor ?? 0) * (qtds[sub.id] ?? 0),
    0,
  );

  const set = (id: string, v: number) => setQtds((p) => ({ ...p, [id]: Math.max(0, v) }));

  const escolherFoto = async (file?: File) => {
    if (!file) return;
    try {
      setFoto(await comprimirImagem(file));
    } catch {
      toast.error("Não foi possível usar essa foto");
    }
  };

  const salvar = () => {
    const entradas = subitens
      .map((s) => ({ item_id: itemId, subitem_id: s.id, quantidade: qtds[s.id] ?? 0 }))
      .filter((e) => e.quantidade > 0);
    if (entradas.length === 0) return;
    registrar(dia, entradas, { observacao: observacao.trim() || undefined, foto });
    toast.success(`${total} peças registradas em ${formatBR(dia)}`);
    navigate({ to: "/calendario" });
  };

  return (
    <AppShell
      title={item?.nome ?? "Item"}
      subtitle={formatBR(dia)}
      left={
        <Link
          to="/"
          search={{ data: dia }}
          aria-label="Voltar"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-foreground/15"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      }
    >
      {subitens.length === 0 ? (
        <div className="rounded-3xl bg-card p-6 text-center shadow-sm">
          <p className="font-semibold">Nenhuma medida cadastrada</p>
          <Link to="/admin" className="mt-2 inline-block font-bold text-primary">
            Cadastrar em Ajustes
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {subitens.map((s) => {
            const v = qtds[s.id] ?? 0;
            return (
              <div
                key={s.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-3xl bg-card p-4 shadow-sm"
              >
                <span className="min-w-0">
                  <span className="block truncate text-lg font-bold">{s.nome}</span>
                  <span className="block text-xs font-medium text-muted-foreground">
                    {s.valor
                      ? `${formatBRL(s.valor)} un.${v > 0 ? ` · ${formatBRL(s.valor * v)}` : ""}`
                      : "Sem valor definido"}
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    aria-label={`Diminuir ${s.nome}`}
                    onClick={() => set(s.id, v - 1)}
                    className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground active:scale-95"
                  >
                    <Minus className="h-6 w-6" />
                  </button>
                  <input
                    inputMode="numeric"
                    aria-label={`Quantidade ${s.nome}`}
                    value={v}
                    onChange={(e) => set(s.id, Number(e.target.value.replace(/\D/g, "")) || 0)}
                    className="h-12 w-16 rounded-2xl border border-border bg-background text-center text-xl font-black outline-none focus:border-primary"
                  />
                  <button
                    aria-label={`Aumentar ${s.nome}`}
                    onClick={() => set(s.id, v + 1)}
                    className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground active:scale-95"
                  >
                    <Plus className="h-6 w-6" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {total > 0 && !confirmando && (
        <div className="fixed inset-x-0 bottom-20 z-30 px-4">
          <button
            onClick={() => setConfirmando(true)}
            className="mx-auto flex w-full max-w-2xl items-center justify-between rounded-3xl bg-primary px-6 py-4 text-lg font-extrabold text-primary-foreground shadow-lg active:scale-[0.99]"
          >
            <span>Confirmar</span>
            <span className="rounded-xl bg-primary-foreground/20 px-3 py-1">{total}</span>
          </button>
        </div>
      )}

      {confirmando && (
        <div className="fixed inset-0 z-40 flex items-end bg-foreground/40 p-3">
          <div className="mx-auto max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-card p-5 shadow-lg">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <h2 className="truncate text-lg font-extrabold">Confirmar lançamento</h2>
              <button
                aria-label="Fechar"
                onClick={() => setConfirmando(false)}
                className="grid h-9 w-9 place-items-center rounded-xl bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{formatBR(dia)}</p>

            <ul className="mt-3 space-y-1">
              {subitens
                .filter((s) => (qtds[s.id] ?? 0) > 0)
                .map((s) => (
                  <li key={s.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-sm">
                    <span className="min-w-0 truncate text-muted-foreground">{s.nome}</span>
                    <span className="shrink-0 font-bold">{qtds[s.id]}</span>
                  </li>
                ))}
            </ul>

            <label className="mt-4 block text-sm font-bold" htmlFor="obs">
              Observação (opcional)
            </label>
            <textarea
              id="obs"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              placeholder="Ex: produção concluída pela manhã"
              className="mt-1 w-full rounded-2xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
            />

            <input
              ref={inputFoto}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => escolherFoto(e.target.files?.[0])}
            />

            {foto ? (
              <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                <img
                  src={foto}
                  alt="Foto do lançamento"
                  className="h-20 w-20 rounded-2xl object-cover"
                />
                <button
                  onClick={() => setFoto(undefined)}
                  className="justify-self-start rounded-2xl bg-destructive/10 px-4 py-2 text-sm font-bold text-destructive"
                >
                  Remover foto
                </button>
              </div>
            ) : (
              <button
                onClick={() => inputFoto.current?.click()}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary py-3 font-bold text-primary"
              >
                <Camera className="h-5 w-5" />
                Anexar foto
              </button>
            )}

            <button
              onClick={salvar}
              className="mt-4 flex w-full items-center justify-between rounded-3xl bg-primary px-6 py-4 text-lg font-extrabold text-primary-foreground active:scale-[0.99]"
            >
              <span>Salvar registro</span>
              <span className="rounded-xl bg-primary-foreground/20 px-3 py-1">{total}</span>
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
