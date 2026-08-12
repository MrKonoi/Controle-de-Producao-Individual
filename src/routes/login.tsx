import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogIn, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth, entrar, cadastrar } from "@/lib/auth-store";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Entrar — Controle de Produção" },
      {
        name: "description",
        content: "Acesse sua conta para registrar e acompanhar a produção diária.",
      },
      { property: "og:title", content: "Entrar — Controle de Produção" },
      {
        property: "og:description",
        content: "Acesse sua conta para registrar e acompanhar a produção diária.",
      },
    ],
  }),
});

function LoginPage() {
  const { atual, pronto } = useAuth();
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (pronto && atual) navigate({ to: "/", search: {}, replace: true });
  }, [pronto, atual, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    const erro =
      modo === "entrar" ? await entrar(email, senha) : await cadastrar(nome, email, senha);
    setEnviando(false);
    if (erro) {
      toast.error(erro);
      return;
    }
    toast.success(modo === "entrar" ? "Bem-vindo de volta!" : "Conta criada!");
    navigate({ to: "/", search: {}, replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-background px-5 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-primary text-primary-foreground">
            <LogIn className="h-8 w-8" />
          </span>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Controle de Produção
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {modo === "entrar"
              ? "Entre para registrar sua produção diária."
              : "Crie sua conta em poucos segundos."}
          </p>
        </div>

        <form onSubmit={submit} className="rounded-3xl bg-card p-5 shadow-sm">
          {modo === "cadastrar" && (
            <label className="mb-4 block">
              <span className="mb-1 block text-sm font-bold text-foreground">Nome completo</span>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: João da Silva"
                className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary"
              />
            </label>
          )}

          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-bold text-foreground">E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="voce@email.com"
              className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary"
            />
          </label>

          <label className="mb-5 block">
            <span className="mb-1 block text-sm font-bold text-foreground">Senha</span>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••"
              className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary"
            />
          </label>

          <button
            type="submit"
            disabled={enviando}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-base font-extrabold text-primary-foreground active:scale-[0.99] transition-transform disabled:opacity-70"
          >
            {enviando ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : modo === "entrar" ? (
              <>
                <LogIn className="h-5 w-5" /> Acessar
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5" /> Criar conta
              </>
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Seus dados ficam salvos na nuvem: entre com a mesma conta em qualquer aparelho.
        </p>

        <button
          type="button"
          onClick={() => setModo(modo === "entrar" ? "cadastrar" : "entrar")}
          className="mt-4 w-full text-sm font-bold text-primary"
        >
          {modo === "entrar" ? "Não tem conta? Cadastre-se" : "Já tenho conta. Entrar"}
        </button>
      </div>
    </div>
  );
}
