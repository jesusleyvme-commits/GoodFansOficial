import { Activity, ChevronDown, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { testLinkPixel } from "@/lib/meta-test";
import { currentAccessToken } from "@/lib/use-auth";

type TestResult = {
  ok: boolean;
  message: string;
  hint?: string;
  detail?: string;
  pixelId?: string;
};

type MetaTestButtonProps = {
  /** O teste é do link, porque cada um pode apontar para um pixel diferente. */
  linkId: string;
  /** Rótulo curto, para caber na linha do link. */
  label?: string;
  className?: string;
};

/**
 * Manda um evento de teste para a Conversions API e mostra o que a Meta
 * respondeu. A chamada roda no servidor porque exige o token em claro.
 *
 * O código de eventos de teste é colado a cada teste, e não guardado: a Meta o
 * troca com o tempo e um código velho guardado falharia sem explicar por quê.
 * Ele também não é opcional — sem ele a Meta contaria a conversão de teste como
 * uma venda real, e o servidor recusa o envio.
 */
export function MetaTestButton({ linkId, label = "Testar pixel", className }: MetaTestButtonProps) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [testEventCode, setTestEventCode] = useState("");

  async function run() {
    if (testing) return;

    setTesting(true);
    setResult(null);
    setShowDetail(false);

    try {
      const res = await testLinkPixel({
        data: { linkId, accessToken: await currentAccessToken(), testEventCode },
      });
      setResult(res);
    } catch (error) {
      setResult({
        ok: false,
        message: error instanceof Error ? error.message : "Não foi possível testar.",
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={testing}
        onClick={() => void run()}
        className={className}
      >
        {testing ? <Loader2 className="animate-spin" /> : <Activity />}
        {testing ? "Testando..." : label}
      </Button>

      <Input
        value={testEventCode}
        onChange={(event) => setTestEventCode(event.target.value)}
        maxLength={64}
        autoComplete="off"
        spellCheck={false}
        placeholder="Código de teste da Meta"
        aria-label="Código de teste de evento da Meta"
        className="h-8 font-mono text-xs"
      />

      {result && (
        <div className="space-y-1">
          <p role="status" className={`text-xs ${result.ok ? "text-emerald-300" : "text-red-300"}`}>
            {result.message}
          </p>

          {result.hint && <p className="text-xs text-muted-foreground">{result.hint}</p>}

          {result.detail && (
            <>
              <button
                type="button"
                onClick={() => setShowDetail((current) => !current)}
                className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground/80 transition-colors hover:text-muted-foreground"
              >
                <ChevronDown className={showDetail ? "size-3 rotate-180" : "size-3"} />
                Resposta da Meta
              </button>

              {showDetail && (
                <pre className="overflow-x-auto rounded-input border border-white/[0.06] bg-white/[0.02] p-2 font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap text-muted-foreground">
                  {result.detail}
                </pre>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
