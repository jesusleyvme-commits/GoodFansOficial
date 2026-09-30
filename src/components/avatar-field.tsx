import { Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/button";
import { avatarUrl } from "@/lib/avatars";

type AvatarFieldProps = {
  /** Caminho da foto já salva, usado quando não há arquivo novo escolhido. */
  avatarPath: string | null;
  /** Inicial mostrada enquanto a conta não tem foto. */
  fallbackInitial: string;
  /** controlled: o pai guarda o arquivo para enviar no submit. */
  file: File | null;
  onPick: (file: File | null) => void;
};

/**
 * Foto do perfil com pré-visualização. Desfazer a escolha volta a mostrar a foto
 * que está no banco, não um buraco, porque o arquivo anterior continua salvo lá.
 */
export function AvatarField({ avatarPath, fallbackInitial, file, onPick }: AvatarFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(() => avatarUrl(avatarPath));

  // O object URL precisa ser revogado, senão cada escolha vaza a imagem inteira
  // na memória do navegador.
  useEffect(() => {
    if (!file) {
      setPreview(avatarUrl(avatarPath));
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [file, avatarPath]);

  function choose(next: File | null) {
    onPick(next);
    // Zerar o value permite escolher o mesmo arquivo outra vez: sem isso o
    // onChange não dispara e o botão "Remover" parece não funcionar.
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
      {preview ? (
        <img
          src={preview}
          alt="Pré-visualização"
          className="size-16 shrink-0 rounded-full border border-white/10 object-cover"
        />
      ) : (
        <span className="grid size-16 shrink-0 place-items-center rounded-full border border-dashed border-white/15 text-lg font-semibold text-muted-foreground">
          {fallbackInitial || "?"}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => inputRef.current?.click()}
          >
            <Upload />
            Escolher foto
          </Button>

          {(file || preview) && (
            <Button variant="ghost" size="sm" type="button" onClick={() => choose(null)}>
              <X />
              Remover
            </Button>
          )}
        </div>

        <p className="mt-2 text-xs text-muted-foreground">JPG, PNG, WebP ou GIF de até 2 MB.</p>
      </div>

      <input
        ref={inputRef}
        id="profile-avatar"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) => choose(event.target.files?.[0] ?? null)}
      />
    </div>
  );
}
