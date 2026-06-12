const BRAND = "#1D9E75";

const PRESET_AVATARS: Record<string, string> = {
  lion:   "🦁",
  eagle:  "🦅",
  fire:   "🔥",
  rocket: "🚀",
  crown:  "👑",
  bolt:   "⚡",
  star:   "⭐",
  shield: "🛡️",
  dragon: "🐉",
  wolf:   "🐺",
  fox:    "🦊",
  bear:   "🐻",
};

function isPreset(url: string | null): boolean {
  return url?.startsWith("preset:") ?? false;
}

export function AvatarDisplay({
  avatarUrl,
  username,
  size = "md",
}: {
  avatarUrl: string | null | undefined;
  username: string;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  const dim =
    size === "lg" ? "w-20 h-20 text-4xl" :
    size === "md" ? "w-9 h-9 text-lg"   :
    size === "sm" ? "w-7 h-7 text-sm"   :
                    "w-6 h-6 text-xs";

  if (avatarUrl && isPreset(avatarUrl)) {
    const emoji = PRESET_AVATARS[avatarUrl.replace("preset:", "")] ?? "🙂";
    return (
      <div className={`${dim} rounded-full flex items-center justify-center bg-gray-100 flex-shrink-0`}>
        {emoji}
      </div>
    );
  }

  if (avatarUrl && !isPreset(avatarUrl)) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={avatarUrl}
        alt={username}
        className={`${dim} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

  // Fallback: coloured initial
  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center text-white font-black uppercase flex-shrink-0`}
      style={{ backgroundColor: BRAND }}
    >
      {(username ?? "?")[0]}
    </div>
  );
}
