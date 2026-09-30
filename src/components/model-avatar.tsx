import type { Model } from "@/lib/database.types";
import { avatarUrl } from "@/lib/avatars";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-9 text-xs",
  md: "size-12 text-sm",
} as const;

type ModelAvatarProps = {
  model: Pick<Model, "id" | "name" | "avatar_path">;
  size?: keyof typeof SIZES;
  className?: string;
};

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

/**
 * Avatar com fallback para as iniciais, que é o caso de toda modelo recién
 * cadastrada, porque o upload só existe depois que a linha ganha id.
 */
export function ModelAvatar({ model, size = "md", className }: ModelAvatarProps) {
  const url = avatarUrl(model.avatar_path);

  if (url) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        className={cn(
          "shrink-0 rounded-full border border-white/10 object-cover",
          SIZES[size],
          className,
        )}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-gradient-brand font-bold text-white uppercase",
        SIZES[size],
        className,
      )}
    >
      {initials(model.name)}
    </span>
  );
}
