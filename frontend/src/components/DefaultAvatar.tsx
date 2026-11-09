const avatarColors = [
  "#C6F36B", // Electric Lime
  "#FFE600", // Bright Yellow
  "#FF6B6B", // Coral Red
  "#4ECDC4", // Teal
  "#A8E6CF", // Mint
  "#FFD93D", // Gold
  "#6C5CE7", // Purple
  "#FFA502", // Orange
];

function colorFor(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash) % avatarColors.length;
}

export function DefaultAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-9 w-9", md: "h-12 w-12", lg: "h-16 w-16" };
  const initials = (name || "P").slice(0, 2).toUpperCase();

  return (
    <div
      aria-label={`${name || "Player"} profile avatar`}
      className={`default-avatar grid shrink-0 place-items-center border-[3px] border-black text-black font-black select-none ${sizes[size]}`}
      style={{ backgroundColor: avatarColors[colorFor(name || "player")] }}
    >
      <span className={size === "lg" ? "text-xl tracking-tighter" : size === "md" ? "text-base tracking-tighter" : "text-xs tracking-tighter"}>
        {initials}
      </span>
    </div>
  );
}
