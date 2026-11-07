const avatarColors = ["#C6F36B", "#8ED1FC", "#F7A8B8", "#D7B5F8", "#F6C667", "#8DE0C2"];

function colorFor(value: string) {
  return [...value].reduce((total, character) => total + character.charCodeAt(0), 0) % avatarColors.length;
}

export function DefaultAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "?";
  const sizes = { sm: "h-9 w-9 text-xs", md: "h-12 w-12 text-sm", lg: "h-14 w-14 text-xl" };
  return <div aria-label={`${name || "Player"} default profile`} className={`grid shrink-0 place-items-center rounded-full font-bold text-[#101112] ${sizes[size]}`} style={{ backgroundColor: avatarColors[colorFor(name || "player")] }}>{initials}</div>;
}
