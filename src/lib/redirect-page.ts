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
  /**
   * Recusa do servidor a ser mostrada no topo do formulário. Só aparece quando
   * o POST volta sem redirect, e o texto é fixo aqui: a validação é do banco e
   * este arquivo não recebe motivo do Postgres para virar HTML.
   */
  error?: string | null;
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

export const DEFAULT_HEADLINE = "Seu acesso está liberado";
export const DEFAULT_SUBHEAD = "Clique abaixo para entrar.";


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
 * Com o gate ligado, quem manda o sinal de servidor é o próprio POST do
 * formulário, porque ele já chega aqui de qualquer jeito — inclusive sem
 * JavaScript. Se os dois mandassem, seria o mesmo `event_id` duas vezes. Com o
 * gate, então, este script cuida só do `fbq`, que é o que o navegador tem e o
 * servidor não.
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

  const beacon = input.gate
    ? ""
    : `  var body=new Blob([JSON.stringify({eventId:${eventId}})],{type:'application/json'});
  if(navigator.sendBeacon){navigator.sendBeacon(${trackUrl},body);}
  else{fetch(${trackUrl},{method:'POST',body:body,keepalive:true,headers:{'Content-Type':'application/json'}}).catch(function(){});}
`;

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
${beacon}  fbq('track','Purchase'${pixelValueArgs(input.valueEur)},{eventID:${eventId}});
 };
 ${input.gate ? "c.form.addEventListener('submit',send);" : "c.addEventListener('click',send);"}
})();
</script>`;
}


const CONSENT_LABEL =
  "Autorizo o uso dos meus dados para liberar este acesso e receber novidades sobre o conteúdo.";

/**
 * Campos do gate. `required` em todos os que estão ligados: o creator liga um
 * campo para collectar, não para sugerir.
 *
 * O `autocomplete` não é enfeite. Em celular ele abre o teclado com o tipo
 * certo e com preenchimento automático, e é o que faz o visitante em vez de
 * desistir. Sem ele, o campo de telefone vira uma parede de digitar número.
 */
function renderGateField(input: {
  name: string;
  label: string;
  type: string;
  autocomplete: string;
  placeholder: string;
  inputmode?: string;
}): string {
  const mode = input.inputmode ? ` inputmode="${escapeAttribute(input.inputmode)}"` : "";
  return `<label class="field">
<span class="label">${escapeHtml(input.label)}</span>
<input class="input" type="${escapeAttribute(input.type)}" name="${escapeAttribute(input.name)}" autocomplete="${escapeAttribute(input.autocomplete)}" placeholder="${escapeAttribute(input.placeholder)}"${mode} required>
</label>`;
}

/**
 * O formulário de coleta.
 *
 * O destino **não** entra no HTML. Com ele no `action` ou em qualquer
 * atributo, bastaria abrir o código-fonte para pular a coleta — que é a única
 * coisa que essa tela faz. O destino volta na resposta do POST, um 303 para
 * quem preencheu.
 */
function renderGateForm(data: {
  linkId: string;
  eventId: string;
  collectName: boolean;
  collectEmail: boolean;
  collectPhone: boolean;
  privacyNote: string;
  preview: boolean;
  error: string | null;
}): string {
  const fields: string[] = [];

  if (data.collectName) {
    fields.push(
      renderGateField({
        name: "name",
        label: "Nome completo",
        type: "text",
        autocomplete: "name",
        placeholder: "Como podemos te chamar",
      }),
    );
  }

  if (data.collectEmail) {
    fields.push(
      renderGateField({
        name: "email",
        label: "E-mail",
        type: "email",
        autocomplete: "email",
        placeholder: "voce@exemplo.com",
        inputmode: "email",
      }),
    );
  }

  if (data.collectPhone) {
    fields.push(
      renderGateField({
        name: "phone",
        label: "Telefone",
        type: "tel",
        autocomplete: "tel",
        placeholder: "11 98888-7777",
        inputmode: "tel",
      }),
    );
  }

  if (fields.length === 0) return "";

  return `<form class="gate" method="post" action="/go/${escapeAttribute(data.linkId)}"${data.preview ? ' data-preview="1"' : ""}>
<input type="hidden" name="eventId" value="${escapeAttribute(data.eventId)}">
${data.error ? `<p class="form-error" role="alert">${escapeHtml(data.error)}</p>` : ""}
${fields.join("\n")}
<label class="consent">
<input type="checkbox" name="consent" value="1" required>
<span>${escapeHtml(CONSENT_LABEL)}</span>
</label>
<p class="privacy">${escapeHtml(data.privacyNote)}</p>
<button class="cta" id="cta" type="submit">Entrar agora</button>
</form>`;
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
.gate{margin-top:24px;text-align:left}
.form-error{
  margin:0 0 16px;padding:11px 14px;border-radius:11px;
  font-size:.8125rem;line-height:1.5;color:#fecaca;
  background:rgba(220,38,38,.13);border:1px solid rgba(220,38,38,.35);
}
.field{display:block;margin-bottom:14px}
.label{display:block;margin-bottom:6px;font-size:.8125rem;font-weight:500;color:#c3cbdb}
.input{
  width:100%;padding:13px 14px;border-radius:12px;
  border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);
  color:#f4f6fb;font:inherit;font-size:.9375rem;
  transition:border-color .15s ease,box-shadow .15s ease;
}
.input::placeholder{color:#5f6a7d}
.input:focus{outline:none;border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.2)}
.input:user-invalid{border-color:#dc2626}
.consent{
  display:flex;gap:10px;align-items:flex-start;margin:18px 0 0;
  font-size:.8125rem;line-height:1.55;color:#9aa5b8;cursor:pointer;text-align:left;
}
.consent input{
  width:17px;height:17px;margin:2px 0 0;flex:0 0 auto;accent-color:#3b82f6;cursor:pointer;
}
.privacy{margin:12px 0 0;font-size:.75rem;line-height:1.6;color:#6b7688}
button.cta{
  display:block;width:100%;margin-top:22px;padding:16px 28px;border-radius:16px;
  font:inherit;font-size:1rem;font-weight:600;color:#fff;cursor:pointer;
  border:0;background-image:linear-gradient(135deg,#93c5fd 0%,#3b82f6 50%,#1d4ed8 100%);
  box-shadow:0 14px 40px -10px rgba(59,130,246,.55);
  transition:filter .2s ease,transform .2s ease;
}
button.cta:hover{filter:brightness(1.1)}
button.cta:active{transform:translateY(1px)}
button.cta:focus-visible{outline:2px solid #93c5fd;outline-offset:3px}
.preview-ribbon{
  position:fixed;top:0;left:0;right:0;z-index:10;
  padding:9px 16px;text-align:center;
  font-size:.75rem;font-weight:600;letter-spacing:.02em;color:#7c2d12;
  background:#fed7aa;border-bottom:1px solid #fdba74;
}
.preview-ribbon code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:400}
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
  const preview = data.preview === true;

  // O gate só existe se ao menos um campo estiver ligado. Sem nenhum, a página
  // é a âncora direta de sempre, que é mais rápida e não tem o que coletar.
  const gate = data.collectName === true || data.collectEmail === true || data.collectPhone === true;

  const headline = escapeHtml(data.headline?.trim() || DEFAULT_HEADLINE);
  const subhead = escapeHtml(data.subhead?.trim() || (gate ? "" : DEFAULT_SUBHEAD));
  const privacyNote = data.privacyNote?.trim() || DEFAULT_PRIVACY_NOTE;

  const form = gate
    ? renderGateForm({
        linkId: data.linkId,
        eventId: data.eventId,
        collectName: data.collectName === true,
        collectEmail: data.collectEmail === true,
        collectPhone: data.collectPhone === true,
        privacyNote,
        preview,
        error: data.error ?? null,
      })
    : "";

  // No preview o pixel é cortado de propósito. Se o creator abrir a
  // pré-visualização de um link que já tem pixel e ele disparasse, entraria uma
  // conversão real no relatório do anúncio — de um clique que foi só olhar a
  // tela, e para um link que talvez nem exista mais.
  const conversion = pixelId && !preview
    ? renderConversionScript({
        pixelId,
        valueEur: data.valueEur,
        eventId: data.eventId,
        // A mesma rota que serve a página recebe o envio do formulário em
        // form-urlencoded e o clique em JSON. O POST separa os dois pelo
        // content-type, então não é preciso uma rota nova.
        trackUrl: `/go/${escapeAttribute(data.linkId)}`,
        gate,
      })
    : "";

  // Com o gate, a âncora some e o destino não aparece em lugar nenhum do HTML.
  const callToAction = gate
    ? ""
    : `<a class="cta" id="cta" href="${href}" rel="noopener noreferrer">Entrar agora</a>`;

  const ribbon = preview
    ? `<div class="preview-ribbon">Pré-visualização — enviar o formulário aqui não grava nada e não conta como conversão. Destino real: <code>${href}</code></div>`
    : "";

  // No preview, o submit é bloqueado no navegador. Sem isso o creator testaria o
  // botão e derrubaria dados de verdade na lista dele, achando que era rascunho.
  const previewGuard = preview
    ? `<script>
document.addEventListener('submit',function(e){
 e.preventDefault();
 var b=document.getElementById('cta');
 if(b){var t=b.textContent;b.textContent='Nada foi enviado (preview)';setTimeout(function(){b.textContent=t},1600);}
},true);
</script>`
    : "";

  const mark = data.showLogo === false ? "" : `<div class="mark"><span></span></div>`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#05060a">
<meta name="robots" content="noindex,nofollow">
${preview ? '<meta name="robots" content="noindex,nofollow,noarchive">' : ""}
<title>${title}</title>
<link rel="preconnect" href="https://connect.facebook.net" crossorigin>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" media="print" onload="this.media='all'" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
<style>${STYLES}</style>
</head>
<body>
${ribbon}
<main class="card">
  ${mark}
  <p class="product">${title}</p>
  <h1 class="title">${headline}</h1>
  ${subhead ? `<p class="sub">${subhead}</p>` : ""}
  ${form}
  ${callToAction}
</main>
${conversion}
${previewGuard}
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
