import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useDB, registrar, hojeISO, formatBR } from "@/lib/producao-store";

export const Route = createFileRoute("/item/$itemId")({
  component: ItemPage,
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
  const db = useDB();
  const navigate = useNavigate();
  const [qtds, setQtds] = useState<Record<string, number>>({});

  const item = db.itens.find((i) => i.id === itemId);
  const subitens = db.subitens.filter((s) => s.item_id === itemId);
  const total = Object.values(qtds).reduce((s, n) => s + n, 0);

  const set = (id: string, v: number) =>
    setQtds((p) => ({ ...p, [id]: Math.max(0, v) }));

  const salvar = () => {
    const entradas = subitens
      .map((s) => ({ item_id: itemId, subitem_id: s.id, quantidade: qtds[s.id] ?? 0 }))
      .filter((e) => e.quantidade > 0);
    if (entradas.length === 0) return;
    registrar(hojeISO(), entradas);
    toast.success(`${total} peças registradas em ${formatBR(hojeISO())}`);
    navigate({ to: "/" });
  };

  return (
    <AppShell
      title={item?.nome ?? "Item"}
      subtitle={formatBR(hojeISO())}
      left={
        <Link
          to="/"
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
                <span className="min-w-0 truncate text-lg font-bold">{s.nome}</span>
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

      {total > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-30 px-4">
          <button
            onClick={salvar}
            className="mx-auto flex w-full max-w-2xl items-center justify-between rounded-3xl bg-primary px-6 py-4 text-lg font-extrabold text-primary-foreground shadow-lg active:scale-[0.99]"
          >
            <span>Adicionar ao registro do dia</span>
            <span className="rounded-xl bg-primary-foreground/20 px-3 py-1">{total}</span>
          </button>
        </div>
      )}
    </AppShell>
  );
}
