import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Package } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth, primeiroNome } from "@/lib/auth-store";
import { useDB, hojeISO, formatBR, formatBRL, somaValor } from "@/lib/producao-store";

export const Route = createFileRoute("/")({
  component: Home,
  validateSearch: (search: Record<string, unknown>): { data?: string } =>
    typeof search.data === "string" ? { data: search.data } : {},
  head: () => ({
    meta: [
      { title: "Controle de Produção Diária" },
      {
        name: "description",
        content:
          "Registre a produção diária por item e subitem em poucos toques, direto do celular.",
      },
      { property: "og:title", content: "Controle de Produção Diária" },
      {
        property: "og:description",
        content: "Registre a produção diária por item e subitem em poucos toques, direto do celular.",
      },
    ],
  }),
});

function Home() {
  const db = useDB();
  const { atual } = useAuth();
  const { data } = Route.useSearch();
  const dia = data ?? hojeISO();
  const hoje = hojeISO();
  const registrosDia = db.producao.filter((p) => p.data === dia);
  const totalDia = registrosDia.reduce((s, p) => s + p.quantidade, 0);
  const valorDia = somaValor(registrosDia);

  const itensAtivos = db.itens.filter((i) => !i.arquivado);

  return (
    <AppShell
      title={
        atual ? `Olá, ${primeiroNome(atual.nome)}! O que vamos produzir hoje?` : "Produção"
      }
      subtitle={formatBR(dia)}
    >
      <div className="mb-5 rounded-3xl bg-card p-5 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">
          {dia === hoje ? "Produzido hoje" : `Produzido em ${formatBR(dia)}`}
        </p>
        <p className="text-4xl font-black text-foreground">{totalDia}</p>
        {valorDia > 0 && (
          <p className="text-lg font-extrabold text-primary">{formatBRL(valorDia)}</p>
        )}
        <Link
          to="/calendario"
          className="mt-2 inline-block text-sm font-semibold text-primary"
        >
          Ver registro do dia →
        </Link>
      </div>

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Escolha o item
      </h2>

      {itensAtivos.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {itensAtivos.map((item) => {
            const subs = db.subitens.filter(
              (s) => s.item_id === item.id && !s.arquivado,
            ).length;
            return (
              <Link
                key={item.id}
                to="/item/$itemId"
                params={{ itemId: item.id }}
                search={{ data: dia }}
                className="flex min-h-32 flex-col justify-between rounded-3xl bg-card p-4 shadow-sm active:scale-[0.98] transition-transform"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
                  <Package className="h-6 w-6" />
                </span>
                <span>
                  <span className="block text-lg font-extrabold leading-tight text-foreground">
                    {item.nome}
                  </span>
                  <span className="flex items-center text-xs font-medium text-muted-foreground">
                    {subs} {subs === 1 ? "medida" : "medidas"}
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl bg-card p-6 text-center shadow-sm">
      <p className="font-semibold text-foreground">Nenhum item cadastrado</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Cadastre seus itens na tela de Ajustes.
      </p>
      <Link
        to="/admin"
        className="mt-4 inline-flex rounded-2xl bg-primary px-5 py-3 font-bold text-primary-foreground"
      >
        Ir para Ajustes
      </Link>
    </div>
  );
}
