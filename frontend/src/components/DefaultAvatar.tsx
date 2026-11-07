const avatarColors = ["#C6F36B", "#8ED1FC", "#F7A8B8", "#D7B5F8", "#F6C667", "#8DE0C2"];

function colorFor(value: string) {
  return [...value].reduce((total, character) => total + character.charCodeAt(0), 0) % avatarColors.length;
}

export function DefaultAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-9 w-9", md: "h-12 w-12", lg: "h-16 w-16" };
  return <div aria-label={`${name || "Player"} default profile`} className={`default-avatar relative shrink-0 overflow-hidden rounded-full ${sizes[size]}`} style={{ backgroundColor: avatarColors[colorFor(name || "player")] }}>
    <span className="absolute left-1/2 top-[18%] h-[34%] w-[34%] -translate-x-1/2 rounded-full bg-white/90"/>
    <span className="absolute bottom-[-8%] left-1/2 h-[54%] w-[72%] -translate-x-1/2 rounded-[50%_50%_0_0] bg-white/90"/>
  </div>;
}
