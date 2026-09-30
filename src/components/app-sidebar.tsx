import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Shapes, Wallet, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/user-menu";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Shapes;
};

/**
 * A ordem é a que o uso pede: o resumo do negócio, o dinheiro, e o que se
 * gerencia.
 *
 * `Configurações` e `Usuários` não entram aqui de propósito. São o mesmo
 * destino para todo mundo e mudam uma vez a cada poucos meses, enquanto these
 * três são o trabalho do dia. Deixá-los só no menu do avatar também evita duas
 * entradas para a mesma tela discordarem sobre qual é a aba ativa.
 */
const ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dashboard/modelos", label: "Modelos", icon: Shapes },
  { to: "/dashboard/financeiro", label: "Financeiro", icon: Wallet },
];

type AppSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  username: string | null;
  displayName: string | null;
  avatarPath: string | null;
  isAdmin: boolean;
};

/**
 * Menu lateral do painel.
 *
 * A partir de `md` ele é uma barra fixa, sempre visível, e o conteúdo do
 * painel é deslocado para a direita. Abaixo disso vira gaveta, porque 288px de
 * menu fixo em uma tela de celular deixa um palmo de conteúdo.
 *
 * A distinção é feita com `matchMedia` e não com classes CSS porque o `inert`
 * e o `aria` precisam da largura real: um menu marcado como `inert` por estar
 * "fechado" no estado enquanto está visível na tela é um menu que ninguém
 * consegue usar com o teclado.
 */
export function AppSidebar({
  open,
  onOpenChange,
  email,
  username,
  displayName,
  avatarPath,
  isAdmin,
}: AppSidebarProps) {
  // O pathname serve de gatilho de fechamento. Escutar o objeto inteiro do
  // router derrubaria a gaveta a cada re-render sem mudança de página.
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const painel = useRef<HTMLDivElement>(null);
  const telaLarga = useMediaQuery("(min-width: 768px)");

  // Na tela larga a barra está sempre aberta; o estado só decide o que acontece
  // no celular.
  const aberto = telaLarga || open;

  // Navegar fecha a gaveta. Um menu que continua aberto em cima da página nova
  // esconde o conteúdo que a pessoa acabou de pedir. Na tela larga não há o que
  // fechar, e chamar o callback realçaria o botão de um menu que continua ali.
  useEffect(() => {
    if (telaLarga) return;
    onOpenChange(false);
    // Só o caminho importa aqui; a função chega nova a cada render do pai e
    // repetiria o efeito sem parar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, telaLarga]);

  // `inert` é o que tira o menu do alcance do teclado quando fechado. O
  // atributo é o padrão correto para "existe no DOM, mas não está na tela"; sem
  // ele, o Tab entraria num menu invisível e um leitor de tela narraria os
  // links de um menu que ninguém está vendo.
  //
  // Feito por efeito, e não como atributo JSX, porque o `inert` só chegou nos
  // tipos do React 19.1 e o projeto compila contra uma versão anterior.
  useEffect(() => {
    if (painel.current) painel.current.inert = !aberto;
  }, [aberto]);

  // Escape fecha, e o foco vai para o próprio painel. Sem isso o foco fica preso
  // num elemento que saiu da tela e o teclado anda só pelo documento de baixo.
  useEffect(() => {
    if (!aberto) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.addEventListener("keydown", onKeyDown);
    // Só na gaveta. Na barra fixa, roubar o foco para o menu a cada
    // re-render jogaria quem está lendo o conteúdo de volta para o menu.
    if (!telaLarga) painel.current?.focus();

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [aberto, onOpenChange, telaLarga]);

  return (
    <>
      <div
        // some do fluxo e do teclado quando fechado, senão o Tab entraria num
        // menu invisível
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200",
          "md:hidden",
          aberto ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      <div
        ref={painel}
        id="menu-lateral"
        role="dialog"
        aria-label="Menu do painel"
        tabIndex={-1}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/[0.06] bg-[#0b0b12] transition-transform duration-200",
          aberto ? "translate-x-0" : "-translate-x-full",
          // O foco no painel é o primeiro destino do teclado; o contorno do
          // `focus-visible` não deve aparecer para quem só abriu o menu.
          "focus:outline-none",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 px-4">
          <Logo className="text-xl" />

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar menu"
            className="grid size-9 cursor-pointer place-items-center rounded-input text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none md:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                // `activeOptions.exact` evita o item "Dashboard" ficar marcado
                // quando a pessoa está no Financeiro ou em Modelos. Sem isso os
                // três iam ficar acesos ao mesmo tempo, já que `/dashboard` é o
                // prefixo de todas — e três abas marcadas não dizem onde ela
                // está.
                activeOptions={{ exact: true }}
                activeProps={{ className: "bg-white/[0.07] text-foreground" }}
                className="flex items-center gap-3 rounded-input px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Avatar no canto inferior esquerdo. Fica num rodapé fixo para que a
            conta fique sempre no mesmo lugar, e o menu do usuário vem junto
            para não haver duas entradas para a mesma coisa. */}
        <div className="shrink-0 border-t border-white/[0.06] p-3">
          <UserMenu
            email={email}
            username={username}
            displayName={displayName}
            avatarPath={avatarPath}
            isAdmin={isAdmin}
            // No rodapé o botão ocupa a largura toda e o menu abre pela mesma
            // borda, senão o balão de opções nascia por cima do próprio menu.
            className="w-full justify-start"
            align="start"
          />
        </div>
      </div>
    </>
  );
}

/**
 * Acompanha uma media query.
 *
 * O objetivo de largura do Tailwind e o do CSS precisam concordar, senão o
 * JavaScript acha que a tela é larga enquanto o navegador esconde a barra. Por
 * isso o mesmo `768px` aparece aqui e no `md:` das classes.
 */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);

    setMatches(list.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/**
 * Botão de três traços. Só existe abaixo de `md`: na tela larga a barra já está
 * sempre aberta, e um botão que "abre" algo que não fecha seria um controle sem
 * efeito.
 */
export function SidebarToggle({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpenChange(!open)}
      aria-label={open ? "Fechar menu" : "Abrir menu"}
      aria-expanded={open}
      aria-controls="menu-lateral"
      className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-input text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none md:hidden"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  );
}
