import { createFileRoute } from "@tanstack/react-router";
import { Archive, ArchiveRestore, Check, Pencil, Plus, X } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  useDB,
  addItem,
  updateItem,
  arquivarItem,
  restaurarItem,
  addSubitem,
  updateSubitem,
  arquivarSubitem,
  restaurarSubitem,
} from "@/lib/producao-store";

export const Route = createFileRoute("/admin")({
  component: Admin,
  head: () => ({
    meta: [
      { title: "Ajustes: itens e subitens" },
      {
        name: "description",
        content: "Cadastre, edite e arquive itens e subitens da produção sem programar nada.",
      },
      { property: "og:title", content: "Ajustes: itens e subitens" },
      {
        property: "og:description",
        content: "Cadastre, edite e arquive itens e subitens da produção.",
      },
    ],
  }),
});

function Admin() {
  const db = useDB();
  const [novoItem, setNovoItem] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState("");
  const [novoSub, setNovoSub] = useState<Record<string, string>>({});

  const iniciarEdicao = (id: string, nome: string) => {
    setEditando(id);
    setRascunho(nome);
  };

  const itensAtivos = db.itens.filter((i) => !i.arquivado);
  const itensArquivados = db.itens.filter((i) => i.arquivado);
  const subsArquivados = db.subitens.filter(
    (s) => s.arquivado && !db.itens.find((i) => i.id === s.item_id)?.arquivado,
  );

  return (
    <AppShell title="Ajustes" subtitle="Itens e medidas">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <input
          value={novoItem}
          onChange={(e) => setNovoItem(e.target.value)}
          placeholder="Novo item (ex: Poste)"
          className="h-12 min-w-0 rounded-2xl border border-border bg-card px-4 font-medium outline-none focus:border-primary"
        />
        <button
          onClick={() => {
            if (!novoItem.trim()) return;
            addItem(novoItem);
            setNovoItem("");
          }}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"
          aria-label="Adicionar item"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {itensAtivos.map((item) => {
          const subs = db.subitens.filter((s) => s.item_id === item.id && !s.arquivado);
          return (
            <div key={item.id} className="rounded-3xl bg-card p-4 shadow-sm">
              {editando === item.id ? (
                <LinhaEdicao
                  valor={rascunho}
                  onChange={setRascunho}
                  onSalvar={() => {
                    if (rascunho.trim()) updateItem(item.id, rascunho);
                    setEditando(null);
                  }}
                  onCancelar={() => setEditando(null)}
                />
              ) : (
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <span className="truncate text-lg font-extrabold">{item.nome}</span>
                  <span className="flex shrink-0 gap-1">
                    <IconBtn label="Editar item" onClick={() => iniciarEdicao(item.id, item.nome)}>
                      <Pencil className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn
                      label="Arquivar item"
                      danger
                      onClick={() => {
                        if (
                          confirm(
                            `Arquivar "${item.nome}"? O histórico continua nos relatórios.`,
                          )
                        )
                          arquivarItem(item.id);
                      }}
                    >
                      <Archive className="h-4 w-4" />
                    </IconBtn>
                  </span>
                </div>
              )}

              <ul className="mt-3 space-y-2">
                {subs.map((s) =>
                  editando === s.id ? (
                    <li key={s.id}>
                      <LinhaEdicao
                        valor={rascunho}
                        onChange={setRascunho}
                        onSalvar={() => {
                          if (rascunho.trim()) updateSubitem(s.id, rascunho);
                          setEditando(null);
                        }}
                        onCancelar={() => setEditando(null)}
                      />
                    </li>
                  ) : (
                    <li
                      key={s.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl bg-background px-3 py-2"
                    >
                      <span className="min-w-0 truncate font-medium">{s.nome}</span>
                      <span className="flex shrink-0 gap-1">
                        <IconBtn label="Editar subitem" onClick={() => iniciarEdicao(s.id, s.nome)}>
                          <Pencil className="h-4 w-4" />
                        </IconBtn>
                        <IconBtn
                          label="Arquivar subitem"
                          danger
                          onClick={() => {
                            if (confirm(`Arquivar "${s.nome}"? O histórico é preservado.`))
                              arquivarSubitem(s.id);
                          }}
                        >
                          <Archive className="h-4 w-4" />
                        </IconBtn>
                      </span>
                    </li>
                  ),
                )}
              </ul>

              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <input
                  value={novoSub[item.id] ?? ""}
                  onChange={(e) => setNovoSub((p) => ({ ...p, [item.id]: e.target.value }))}
                  placeholder="Nova medida (ex: 10x20)"
                  className="h-11 min-w-0 rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
                />
                <button
                  aria-label={`Adicionar medida em ${item.nome}`}
                  onClick={() => {
                    const v = (novoSub[item.id] ?? "").trim();
                    if (!v) return;
                    addSubitem(item.id, v);
                    setNovoSub((p) => ({ ...p, [item.id]: "" }));
                  }}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-secondary text-primary"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {(itensArquivados.length > 0 || subsArquivados.length > 0) && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Arquivados
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Não aparecem em novos lançamentos, mas continuam no histórico e nos relatórios.
          </p>
          <ul className="space-y-2">
            {itensArquivados.map((i) => (
              <li
                key={i.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl bg-card px-4 py-3 shadow-sm"
              >
                <span className="min-w-0 truncate font-bold">{i.nome}</span>
                <IconBtn label={`Restaurar ${i.nome}`} onClick={() => restaurarItem(i.id)}>
                  <ArchiveRestore className="h-4 w-4" />
                </IconBtn>
              </li>
            ))}
            {subsArquivados.map((s) => (
              <li
                key={s.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl bg-card px-4 py-3 shadow-sm"
              >
                <span className="min-w-0 truncate text-sm font-medium">
                  {db.itens.find((i) => i.id === s.item_id)?.nome ?? "—"} · {s.nome}
                </span>
                <IconBtn label={`Restaurar ${s.nome}`} onClick={() => restaurarSubitem(s.id)}>
                  <ArchiveRestore className="h-4 w-4" />
                </IconBtn>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppShell>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded-xl ${
        danger ? "bg-destructive/10 text-destructive" : "bg-secondary text-secondary-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function LinhaEdicao({
  valor,
  onChange,
  onSalvar,
  onCancelar,
}: {
  valor: string;
  onChange: (v: string) => void;
  onSalvar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
      <input
        autoFocus
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSalvar()}
        className="h-11 min-w-0 rounded-2xl border border-primary bg-background px-4 font-medium outline-none"
      />
      <span className="flex shrink-0 gap-1">
        <IconBtn label="Salvar" onClick={onSalvar}>
          <Check className="h-4 w-4" />
        </IconBtn>
        <IconBtn label="Cancelar" onClick={onCancelar}>
          <X className="h-4 w-4" />
        </IconBtn>
      </span>
    </div>
  );
}
