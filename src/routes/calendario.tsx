import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Minus, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  useDB,
  hojeISO,
  formatBR,
  fromISO,
  toISO,
  setQuantidade,
  setObservacao,
  removerFoto,
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
  const [fotoAberta, setFotoAberta] = useState<string | null>(null);
  const [editandoObs, setEditandoObs] = useState<string | null>(null);
  const [rascunhoObs, setRascunhoObs] = useState("");

  const registros = db.producao.filter((p) => p.data === dia);
  const total = registros.reduce((s, p) => s + p.quantidade, 0);

  const primeiroDiaSemana = new Date(mesRef.getFullYear(), mesRef.getMonth(), 1).getDay();
  const diasNoMes = new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 0).getDate();

  const nomesItens = Array.from(new Set(registros.map((p) => p.item_nome)));
  const porItem = nomesItens.map((nome) => ({
    nome,
    linhas: registros.filter((p) => p.item_nome === nome),
  }));

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

      <Link
        to="/"
        search={{ data: dia }}
        className="mt-4 flex items-center justify-center gap-2 rounded-3xl bg-primary px-6 py-4 font-extrabold text-primary-foreground shadow-sm active:scale-[0.99]"
      >
        <Plus className="h-5 w-5" />
        Adicionar produção em {formatBR(dia)}
      </Link>

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
            {porItem.map(({ nome, linhas }) => (
              <div key={nome}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-b border-border pb-1">
                  <span className="truncate font-bold">{nome}</span>
                  <span className="shrink-0 font-bold text-muted-foreground">
                    {linhas.reduce((s, l) => s + l.quantidade, 0)}
                  </span>
                </div>
                <ul className="mt-2 space-y-3">
                  {linhas.map((l) => (
                    <li key={l.id} className="space-y-2">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                        <span className="min-w-0 truncate text-sm font-medium">
                          {l.subitem_nome}
                        </span>
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
                      </div>

                      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                        {l.foto ? (
                          <button
                            onClick={() => setFotoAberta(l.foto!)}
                            aria-label="Ver foto do registro"
                          >
                            <img
                              src={l.foto}
                              alt={`Foto de ${l.subitem_nome}`}
                              className="h-14 w-14 rounded-xl object-cover"
                            />
                          </button>
                        ) : (
                          <span />
                        )}

                        {editandoObs === l.id ? (
                          <div className="min-w-0">
                            <textarea
                              autoFocus
                              rows={2}
                              value={rascunhoObs}
                              onChange={(e) => setRascunhoObs(e.target.value)}
                              className="w-full rounded-2xl border border-primary bg-background p-2 text-sm outline-none"
                            />
                            <div className="mt-1 flex gap-2">
                              <button
                                onClick={() => {
                                  setObservacao(l.id, rascunhoObs);
                                  setEditandoObs(null);
                                }}
                                className="rounded-xl bg-primary px-3 py-1 text-xs font-bold text-primary-foreground"
                              >
                                Salvar
                              </button>
                              <button
                                onClick={() => setEditandoObs(null)}
                                className="rounded-xl bg-secondary px-3 py-1 text-xs font-bold"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditandoObs(l.id);
                              setRascunhoObs(l.observacao ?? "");
                            }}
                            className="flex min-w-0 items-start gap-1 text-left text-xs text-muted-foreground"
                          >
                            <Pencil className="mt-0.5 h-3 w-3 shrink-0" />
                            <span className="min-w-0">
                              {l.observacao || "Adicionar observação"}
                            </span>
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {fotoAberta && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/80 p-4"
          onClick={() => setFotoAberta(null)}
        >
          <img
            src={fotoAberta}
            alt="Foto do registro"
            className="max-h-[80vh] w-auto rounded-2xl object-contain"
          />
          <div className="mt-4 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const alvo = registros.find((p) => p.foto === fotoAberta);
                if (alvo) removerFoto(alvo.id);
                setFotoAberta(null);
              }}
              className="rounded-2xl bg-destructive px-4 py-2 font-bold text-destructive-foreground"
            >
              Remover foto
            </button>
            <button
              onClick={() => setFotoAberta(null)}
              aria-label="Fechar foto"
              className="grid h-10 w-10 place-items-center rounded-2xl bg-card"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
