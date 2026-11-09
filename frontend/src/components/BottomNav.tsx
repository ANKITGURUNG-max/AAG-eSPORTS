import { Home, Trophy, Bell, UserRound, Radio } from "lucide-react";

type Props = { active: string; onChange: (value: string) => void };

export function BottomNav({ active, onChange }: Props) {
  const items = [
    ["home", "Home", Home],
    ["tournaments", "Tournaments", Trophy],
    ["streams", "Live", Radio],
    ["updates", "Updates", Bell],
    ["profile", "Profile", UserRound],
  ] as const;

  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-20 flex w-full border-t-[3px] border-black bg-white dark:bg-[#1a1c23] p-1 shadow-[0_-4px_0px_#000000] dark:shadow-[0_-4px_0px_#c6f36b] transition-colors md:static md:flex-col md:border-[3px] md:p-2 md:shadow-[4px_4px_0px_#000000] md:dark:shadow-[4px_4px_0px_#c6f36b]">
      {items.map(([id, label, Icon]) => {
        const isSelected = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`min-w-0 flex-1 border-2 p-2 text-xs font-black transition-all md:w-full md:flex-none md:p-3 md:text-sm ${
              isSelected
                ? "border-black bg-[#C6F36B] text-black shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#ffffff]"
                : "border-transparent bg-transparent text-black dark:text-white hover:border-black hover:bg-[#F4EFE6] dark:hover:bg-[#282c37]"
            }`}
          >
            <span className="flex flex-col items-center gap-1 md:flex-row md:justify-start md:gap-3">
              <Icon size={20} strokeWidth={2.5} />
              <span className="truncate uppercase tracking-wider">{label}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
