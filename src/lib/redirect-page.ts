import { normalizeDestinationUrl, normalizePixelId } from "@/lib/links";

export type RedirectPageData = {
  destination: string;
  pixelId: string | null;
  productName: string;
  /** Receita do link em euros; null não manda value no evento. */
  valueEur: number | null;
  /** Id do link, usado para o clique saber onde registrar a conversão. */
  linkId: string;
  /**
   * Um id por visita. Vai nos dois sinais — o `fbq` do navegador e o evento de
   * servidor — e é isso que faz a Meta contar uma conversão só, em vez de duas.
   */
  eventId: string;

  // --- Gate de coleta -----------------------------------------------------
  // Todos opcionais. Sem nenhum campo ligado, a página segue sendo a âncora
  // direta de antes: mais rápida, e é o que o /go já fazia.
  showLogo?: boolean;
  collectName?: boolean;
  collectEmail?: boolean;
  collectPhone?: boolean;
  /** Null usa o padrão do app. Texto do creator tem precedência sobre o padrão. */
  headline?: string | null;
  subhead?: string | null;
  privacyNote?: string | null;
  /**
   * Pré-visualização do painel. Renderiza o mesmo HTML, mas sem destino no
   * formulário, sem gravação e com uma tarja avisando. Existe para o preview
   * não poder mentir sobre o que o visitante vai ver.
   */
  preview?: boolean;
};

/**
 * Texto padrão de privacidade.
 *
 * Diz o que é coletado, para que, que a conexão é cifrada e como pedir a
 * exclusão. Deliberadamente sem "100% protegido pela lei" e afins: isso não é
 * um fato verificável sobre o produto, é afirmação de conformidade que depende
 * de operação, retenção e canal de atendimento — e affirmá-la na tela de um
 * consumidor é o tipo de Publicidade enganosa que o CDC art. 37 pune. O texto é
 * editável no painel, e a revisão final é do creator.
 */
export const DEFAULT_PRIVACY_NOTE =
  "Precisamos do seu nome, e-mail e telefone para liberar este acesso. " +
  "Usamos esses dados apenas para entregar o conteúdo e, se você permitir, " +
  "para receber novidades sobre ele. A conexão é criptografada e os dados ficam " +
  "guardados de forma cifrada. Não vendemos seus dados. Para pedir a exclusão " +
  "do que coletamos, responda a esta mensagem.";

const DEFAULT_HEADLINE = "Seu acesso está liberado";
const DEFAULT_SUBHEAD = "Clique abaixo para entrar.";


const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

/** Só é chamado com uma URL http(s) já normalizada. */
function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

/**
 * Literal de JavaScript para um valor dentro do `<script>` inline.
 *
 * `escapeHtml` não serve aqui. Dentro de `<script>` o tokenizador do HTML está em
 * RAWTEXT e não decodifica entidades: uma vírgula escapada viraria `&#39;` e
 * chegaria ao JavaScript como cinco caracteres literais, formando uma string
 * válida e errada — a falha mais traiçoeira possível, porque não dá erro em
 * lugar nenhum. Pior, `</script>` dentro de uma string fecha o elemento e
 * executa o resto como HTML.
 *
 * `JSON.stringify` resolve a primeira parte: devolve um literal válido, com as
 * aspas e barras escapadas. Falta a segunda, e é o `<` virando `<` que
 * garante que nenhuma sequência consiga fechar a tag.
 */
function jsString(value: string): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * O valor vai dentro do objeto do Purchase, e não em texto solto: é assim que a
 * Meta lê a receita. O número sai com ponto decimal porque o `fbq` espera JSON,
 * mesmo com a página em português.
 */
function pixelValueArgs(valueEur: number | null): string {
  if (valueEur === null || !Number.isFinite(valueEur)) return "";
  return `,{value:${JSON.stringify(valueEur)},currency:'EUR'}`;
}

/**
 * Pixel e conversão de servidor, disparados pelo clique em "Entrar agora".
 *
 * O Purchase fica no clique, e não no carregamento, por duas razões que se
 * reforçam: a entrega só acontece quando alguém entra, e quem abre link em
 * Telegram, WhatsApp ou scanner não executa JavaScript — mandando no GET, cada
 * prévia de link contaria como uma venda que não existiu e o retorno do
 * anúncio apareceria inflado sem nenhuma pista de por quê.
 *
 * O `sendBeacon` vai antes do `fbq` de propósito: ele sobrevive à saída da
 * página, que é o que acontece a seguir. O clique não espera nenhum dos dois.
 *
 * Com o gate ligado, o Purchase dispara no `submit` do formulário em vez do
 * `click` da âncora. É o mesmo instante: o visitante decide entrar empurrando o
 * botão, e é ali que a conversão acontece.
 */
function renderConversionScript(input: {
  pixelId: string;
  valueEur: number | null;
  eventId: string;
  trackUrl: string;
  gate: boolean;
}): string {
  const eventId = jsString(input.eventId);
  const trackUrl = jsString(input.trackUrl);
  const pixelId = jsString(input.pixelId);

  return `<script>
(function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
 n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(f._fbq)f._fbq=n;n.push=n;
 n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
 t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init',${pixelId});
(function(){
 var c=document.getElementById('cta');
 if(!c||c.dataset.conversionSent)return;
 c.dataset.conversionSent='1';
 var send=function(){
  var body=new Blob([JSON.stringify({eventId:${eventId}})],{type:'application/json'});
  if(navigator.sendBeacon){navigator.sendBeacon(${trackUrl},body);}
  else{fetch(${trackUrl},{method:'POST',body:body,keepalive:true,headers:{'Content-Type':'application/json'}}).catch(function(){});}
  fbq('track','Purchase'${pixelValueArgs(input.valueEur)},{eventID:${eventId}});
 };
 ${input.gate ? "c.form.addEventListener('submit',send);" : "c.addEventListener('click',send);"}
})();
</script>`;
}


const STYLES = `
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;height:100%}
body{
  background:#05060a;color:#f4f6fb;
  font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
  -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;
  display:flex;align-items:center;justify-content:center;padding:24px;
  background-image:
    radial-gradient(ellipse 80% 60% at 15% 0%,rgba(59,130,246,.16) 0%,transparent 60%),
    radial-gradient(ellipse 70% 60% at 90% 10%,rgba(29,78,216,.14) 0%,transparent 55%),
    linear-gradient(180deg,#080a10 0%,#05060a 100%);
  background-attachment:fixed;
}
.card{
  width:100%;max-width:440px;border-radius:24px;padding:40px 32px;
  background:linear-gradient(180deg,rgba(21,26,36,.92) 0%,rgba(10,13,20,.92) 100%);
  border:1px solid rgba(255,255,255,.06);
  box-shadow:0 24px 70px -24px rgba(0,0,0,.85),0 0 0 1px rgba(255,255,255,.03);
  text-align:center;
}
.mark{
  width:56px;height:56px;margin:0 auto 24px;border-radius:999px;
  background-image:linear-gradient(135deg,#93c5fd 0%,#3b82f6 50%,#1d4ed8 100%);
  display:grid;place-items:center;position:relative;
  box-shadow:0 14px 40px -10px rgba(59,130,246,.55);
}
.mark::after{
  content:"";position:absolute;inset:0;border-radius:999px;
  border:1px solid rgba(147,197,253,.45);animation:pulse 1.5s ease-out infinite;
}
.mark span{display:block;width:14px;height:14px;border-radius:999px;background:#05060a}
.product{
  margin:0 0 8px;font-size:.75rem;font-weight:600;letter-spacing:.18em;
  text-transform:uppercase;
  background-image:linear-gradient(90deg,#93c5fd 0%,#3b82f6 55%,#1d4ed8 100%);
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
.title{margin:0 0 10px;font-size:1.5rem;font-weight:600;letter-spacing:-.02em;line-height:1.3}
.sub{margin:0;color:#8b95a8;font-size:.9375rem;line-height:1.6}
.cta{
  display:block;margin-top:28px;padding:16px 28px;border-radius:16px;
  font-size:1rem;font-weight:600;text-decoration:none;text-align:center;color:#fff;
  background-image:linear-gradient(135deg,#93c5fd 0%,#3b82f6 50%,#1d4ed8 100%);
  box-shadow:0 14px 40px -10px rgba(59,130,246,.55);
  transition:filter .2s ease,transform .2s ease;
}
.cta:hover{filter:brightness(1.1)}
.cta:active{transform:translateY(1px)}
.cta:focus-visible{outline:2px solid #93c5fd;outline-offset:3px}
@keyframes pulse{from{opacity:.55;transform:scale(.9)}70%{opacity:0;transform:scale(1.5)}100%{opacity:0;transform:scale(1.5)}}
@media (prefers-reduced-motion:reduce){.mark::after{animation-duration:.01ms}}
`;

/**
 * O documento completo do /go.
 *
 * HTML escrito à mão de propósito: sem React, sem hidratação, sem payload de
 * framework. O visitante só precisa dessa tela por 1,5 segundo, então cada
 * kilobyte de JavaScript é um kilobyte entre ele e o conteúdo.
 */
export function renderRedirectPage(data: RedirectPageData): string {
  const destination = normalizeDestinationUrl(data.destination);
  if (!destination) throw new Error("renderRedirectPage: o destino precisa ser uma URL http(s)");

  const href = escapeAttribute(destination);
  const title = escapeHtml(data.productName);
  const pixelId = normalizePixelId(data.pixelId);

  const conversion = pixelId
    ? renderConversionScript({
        pixelId,
        valueEur: data.valueEur,
        eventId: data.eventId,
        // A mesma rota que serve a página recebe o clique em POST. Sem rota
        // nova: o GET entrega o conteúdo e o POST registra a conversão.
        trackUrl: `/go/${escapeAttribute(data.linkId)}`,
      })
    : "";

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#05060a">
<meta name="robots" content="noindex,nofollow">
<title>${title}</title>
<link rel="preconnect" href="https://connect.facebook.net" crossorigin>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" media="print" onload="this.media='all'" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
<style>${STYLES}</style>
</head>
<body>
<main class="card">
  <div class="mark"><span></span></div>
  <p class="product">${title}</p>
  <h1 class="title">Seu acesso está liberado</h1>
  <p class="sub">Clique abaixo para entrar.</p>
  <a class="cta" id="cta" href="${href}" rel="noopener noreferrer">Entrar agora</a>
</main>
${conversion}
</body>
</html>`;
}

export function renderUnavailablePage(message = "Este link não está mais disponível."): string {
  const title = escapeHtml(message);

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#05060a">
<meta name="robots" content="noindex,nofollow">
<title>GoodFans</title>
<style>${STYLES}</style>
</head>
<body>
<main class="card">
  <div class="mark"><span></span></div>
  <h1 class="title">${title}</h1>
  <p class="sub">Confira o link e tente novamente.</p>
</main>
</body>
</html>`;
}
