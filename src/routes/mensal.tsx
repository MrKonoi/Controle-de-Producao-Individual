import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useDB, MESES, formatBRL, somaValor } from "@/lib/producao-store";

export const Route = createFileRoute("/mensal")({
  component: Mensal,
  head: () => ({
    meta: [
      { title: "Resumo mensal da produção" },
      {
        name: "description",
        content: "Total produzido no mês, com quantidades por item e por subitem.",
      },
      { property: "og:title", content: "Resumo mensal da produção" },
      {
        property: "og:description",
        content: "Total produzido no mês, com quantidades por item e por subitem.",
      },
    ],
  }),
});

function Mensal() {
  const db = useDB();
  const [mesRef, setMesRef] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const prefixo = `${mesRef.getFullYear()}-${String(mesRef.getMonth() + 1).padStart(2, "0")}`;
  const registros = db.producao.filter((p) => p.data.startsWith(prefixo));
  const total = registros.reduce((s, p) => s + p.quantidade, 0);
  const totalValor = somaValor(registros);

  const nomesItens = Array.from(new Set(registros.map((p) => p.item_nome)));
  const grupos = nomesItens.map((nome) => {
    const doItem = registros.filter((p) => p.item_nome === nome);
    const nomesSubs = Array.from(new Set(doItem.map((p) => p.subitem_nome)));
    const subs = nomesSubs.map((sn) => {
      const linhas = doItem.filter((p) => p.subitem_nome === sn);
      return {
        nome: sn,
        qtd: linhas.reduce((acc, p) => acc + p.quantidade, 0),
        valor: somaValor(linhas),
      };
    });
    return {
      nome,
      subs,
      total: subs.reduce((a, s) => a + s.qtd, 0),
      valor: somaValor(doItem),
    };
  });

  const mudarMes = (d: number) =>
    setMesRef(new Date(mesRef.getFullYear(), mesRef.getMonth() + d, 1));

  return (
    <AppShell title="Resumo mensal">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-3xl bg-card p-3 shadow-sm">
        <button
          aria-label="Mês anterior"
          onClick={() => mudarMes(-1)}
          className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="truncate text-center font-extrabold">
          {MESES[mesRef.getMonth()]}/{mesRef.getFullYear()}
        </p>
        <button
          aria-label="Próximo mês"
          onClick={() => mudarMes(1)}
          className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-4 rounded-3xl bg-primary p-5 text-primary-foreground shadow-sm">
        <p className="text-sm font-medium opacity-85">Total geral do mês</p>
        <p className="text-4xl font-black">{total}</p>
        <p className="mt-1 text-lg font-extrabold opacity-90">{formatBRL(totalValor)}</p>
      </div>

      {grupos.length === 0 ? (
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Nenhuma produção registrada neste mês.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {grupos.map(({ nome, subs, total: t, valor }) => (
            <div key={nome} className="rounded-3xl bg-card p-4 shadow-sm">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <span className="min-w-0">
                  <span className="block truncate text-lg font-extrabold">{nome}</span>
                  {valor > 0 && (
                    <span className="block text-xs font-bold text-muted-foreground">
                      {formatBRL(valor)}
                    </span>
                  )}
                </span>
                <span className="shrink-0 rounded-xl bg-secondary px-3 py-1 font-black text-primary">
                  {t}
                </span>
              </div>
              <ul className="mt-3 space-y-1">
                {subs.map((s) => (
                  <li
                    key={s.nome}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-sm"
                  >
                    <span className="min-w-0 truncate text-muted-foreground">{s.nome}</span>
                    <span className="shrink-0 font-bold">
                      {s.qtd}
                      {s.valor > 0 ? ` · ${formatBRL(s.valor)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>

            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
