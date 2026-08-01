import { Download, Share } from "lucide-react";
import { useEffect, useState } from "react";

type PromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstalarApp() {
  const [prompt, setPrompt] = useState<PromptEvent | null>(null);
  const [instalado, setInstalado] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as PromptEvent);
    };
    const onInstalled = () => {
      setInstalado(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    setInstalado(window.matchMedia("(display-mode: standalone)").matches);
    setIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return (
    <div className="mt-6 rounded-3xl bg-card p-4 shadow-sm">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Aplicativo
      </h2>

      {instalado ? (
        <p className="mt-2 text-sm text-muted-foreground">
          O aplicativo já está instalado neste aparelho.
        </p>
      ) : prompt ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            Instale o app na tela inicial para abrir sem navegador.
          </p>
          <button
            onClick={async () => {
              await prompt.prompt();
              await prompt.userChoice;
              setPrompt(null);
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-extrabold text-primary-foreground active:scale-[0.99]"
          >
            <Download className="h-5 w-5" />
            Baixar aplicativo
          </button>
        </>
      ) : ios ? (
        <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
          <Share className="mt-0.5 h-4 w-4 shrink-0" />
          No iPhone, toque em Compartilhar e depois em "Adicionar à Tela de Início".
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Abra este site no navegador do celular (Chrome) e use "Instalar aplicativo" no menu.
        </p>
      )}
    </div>
  );
}
