import { Camera, MessageCircle, Play } from "lucide-react";

const links = [
  { label: "WhatsApp Channel", href: "https://whatsapp.com/channel/0029VbCOvvRFnSz4w3dyWn0p", Icon: MessageCircle },
  { label: "Instagram", href: "https://www.instagram.com/all_alliance_official/", Icon: Camera },
  { label: "YouTube Hub", href: "https://www.youtube.com/@AllAllianceGamingClub", Icon: Play },
] as const;

export function SocialLinks() {
  return (
    <section className="neo p-5 sm:p-6">
      <span className="neo-badge">OFFICIAL COMMUNITY</span>
      <h3 className="mt-2 text-lg font-black uppercase tracking-tight text-black dark:text-white">
        Join AAG eSports
      </h3>
      <p className="mt-1 text-xs font-bold text-black/60 dark:text-white/70">
        Follow for tournament schedules, custom room codes, roster announcements, and giveaways.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {links.map(({ label, href, Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="neo-ghost flex min-h-12 items-center justify-center gap-2 px-3 text-xs font-black uppercase tracking-wider text-white"
          >
            <Icon size={16} strokeWidth={2.5} />
            <span>{label}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
