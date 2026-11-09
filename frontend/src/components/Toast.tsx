export function Toast({ message, tone = "success" }: { message: string; tone?: "success" | "error" }) {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-1/2 top-4 z-[60] flex w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 items-center gap-3 border-[3px] border-black p-4 text-sm shadow-[5px_5px_0px_#000000] font-bold ${
        tone === "error" ? "bg-[#FF4D4D] text-white" : "bg-[#C6F36B] text-black"
      }`}
    >
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center border-2 border-black text-xs font-black ${
          tone === "error" ? "bg-black text-white" : "bg-black text-[#C6F36B]"
        }`}
      >
        {tone === "error" ? "!" : "✓"}
      </span>
      <span className="flex-1 font-black leading-snug">{message}</span>
    </div>
  );
}
