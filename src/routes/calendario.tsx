import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  useDB,
  hojeISO,
  formatBR,
  fromISO,
  toISO,
  setQuantidade,
  deleteProducao,
  MESES,
} from "@/lib/producao-store";

export const Route = createFileRoute("/calendario")({
  component: Calendario,
  head: () => ({
    meta: [
      { title: "Calendário e registro do dia" },
      {
        name: "description",
        content: "Navegue entre os dias, veja o resumo diário e edite ou exclua registros.",
      },
      { property: "og:title", content: "Calendário e registro do dia" },
      {
        property: "og:description",
        content: "Navegue entre os dias, veja o resumo diário e edite ou exclua registros.",
      },
    ],
  }),
});

function Calendario() {
  const db = useDB();
  const [dia, setDia] = useState(hojeISO());
  const d = fromISO(dia);
  const [mesRef, setMesRef] = useState(() => new Date(d.getFullYear(), d.getMonth(), 1));

  const registros = db.producao.filter((p) => p.data === dia);
  const total = registros.reduce((s, p) => s + p.quantidade, 0);

  const primeiroDiaSemana = new Date(mesRef.getFullYear(), mesRef.getMonth(), 1).getDay();
  const diasNoMes = new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 0).getDate();

  const porItem = db.itens
    .map((item) => ({
      item,
      linhas: registros
        .filter((p) => p.item_id === item.id)
        .map((p) => ({
          ...p,
          nome: db.subitens.find((s) => s.id === p.subitem_id)?.nome ?? "—",
        })),
    }))
    .filter((g) => g.linhas.length > 0);

  const mudarMes = (delta: number) =>
    setMesRef(new Date(mesRef.getFullYear(), mesRef.getMonth() + delta, 1));

  return (
    <AppShell title="Calendário" subtitle={formatBR(dia)}>
      <div className="rounded-3xl bg-card p-4 shadow-sm">
        <div className="mb-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
          <button
            aria-label="Mês anterior"
            onClick={() => mudarMes(-1)}
            className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="truncate text-center font-extrabold">
            {MESES[mesRef.getMonth()]} {mesRef.getFullYear()}
          </p>
          <button
            aria-label="Próximo mês"
            onClick={() => mudarMes(1)}
            className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground">
          {["D", "S", "T", "Q", "Q", "S", "S"].map((w, i) => (
            <span key={i} className="py-1">
              {w}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
            <span key={`e${i}`} />
          ))}
          {Array.from({ length: diasNoMes }).map((_, i) => {
            const iso = toISO(new Date(mesRef.getFullYear(), mesRef.getMonth(), i + 1));
            const tem = db.producao.some((p) => p.data === iso);
            const ativo = iso === dia;
            return (
              <button
                key={iso}
                onClick={() => setDia(iso)}
                className={`relative aspect-square rounded-xl text-sm font-bold ${
                  ativo
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-foreground"
                }`}
              >
                {i + 1}
                {tem && !ativo && (
                  <span className="absolute inset-x-0 bottom-1 mx-auto h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 rounded-3xl bg-card p-5 shadow-sm">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h2 className="truncate text-lg font-extrabold">Resumo do dia</h2>
          <span className="shrink-0 rounded-xl bg-secondary px-3 py-1 font-black text-primary">
            {total}
          </span>
        </div>

        {porItem.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhum registro neste dia.</p>
        ) : (
          <div className="mt-4 space-y-5">
            {porItem.map(({ item, linhas }) => (
              <div key={item.id}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-b border-border pb-1">
                  <span className="truncate font-bold">{item.nome}</span>
                  <span className="shrink-0 font-bold text-muted-foreground">
                    {linhas.reduce((s, l) => s + l.quantidade, 0)}
                  </span>
                </div>
                <ul className="mt-2 space-y-2">
                  {linhas.map((l) => (
                    <li
                      key={l.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"
                    >
                      <span className="min-w-0 truncate text-sm font-medium">{l.nome}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        <button
                          aria-label="Diminuir"
                          onClick={() => setQuantidade(l.id, l.quantidade - 1)}
                          className="grid h-9 w-9 place-items-center rounded-xl bg-secondary"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-10 text-center font-black">{l.quantidade}</span>
                        <button
                          aria-label="Aumentar"
                          onClick={() => setQuantidade(l.id, l.quantidade + 1)}
                          className="grid h-9 w-9 place-items-center rounded-xl bg-secondary"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          aria-label="Excluir registro"
                          onClick={() => deleteProducao(l.id)}
                          className="grid h-9 w-9 place-items-center rounded-xl bg-destructive/10 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
