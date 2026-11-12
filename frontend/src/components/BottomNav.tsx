import { Home, Trophy, Bell, UserRound, Radio, Shield, Users } from "lucide-react";

type Props = { active: string; onChange: (value: string) => void };

export function BottomNav({ active, onChange }: Props) {
  const items = [
    ["home", "Home", Home],
    ["tournaments", "Tourneys", Trophy, "Tournaments"],
    ["squad", "Squad", Shield, "My Squad"],
    ["friends", "Friends", Users, "Find & Friends"],
    ["streams", "Live", Radio, "Live Streams"],
    ["updates", "Updates", Bell, "Updates"],
    ["profile", "Profile", UserRound, "My Profile"],
  ] as const;

  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-20 flex w-full border-t-[3px] border-black bg-white dark:bg-[#1a1c23] px-1 py-1 shadow-[0_-4px_0px_#000000] dark:shadow-[0_-4px_0px_#c6f36b] transition-colors md:static md:flex-col md:border-[3px] md:p-2 md:shadow-[4px_4px_0px_#000000] md:dark:shadow-[4px_4px_0px_#c6f36b] overflow-x-auto">
      {items.map(([id, label, Icon, desktopLabel]) => {
        const isSelected = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`min-w-0 flex-1 shrink-0 border-2 px-1 py-1 text-[9px] sm:text-[11px] font-black transition-all md:w-full md:flex-none md:p-3 md:text-sm ${
              isSelected
                ? "border-black bg-[#C6F36B] text-black shadow-[2px_2px_0px_#000000] md:shadow-[3px_3px_0px_#000000] dark:shadow-[2px_2px_0px_#ffffff]"
                : "border-transparent bg-transparent text-black dark:text-white hover:border-black hover:bg-[#F4EFE6] dark:hover:bg-[#282c37]"
            }`}
          >
            <span className="flex flex-col items-center gap-0.5 md:flex-row md:justify-start md:gap-3">
              <Icon size={16} strokeWidth={2.5} className="md:h-5 md:w-5 shrink-0" />
              <span className="truncate uppercase tracking-tight md:hidden">{label}</span>
              <span className="truncate uppercase tracking-wider hidden md:inline">{desktopLabel}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
