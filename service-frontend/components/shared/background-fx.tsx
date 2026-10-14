import { cn } from "@/lib/utils";

/**
 * Decorative backdrop shared by the auth screens and portals.
 *
 * Designed with a subtle, low-intensity overlay so that brand logos,
 * taglines, headings, form cards, and text remain 100% crisp and readable
 * without background visual interference.
 */
export function BackgroundFX({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-slate-50/70 dark:bg-zinc-950/80",
        className
      )}
    >
      {/* Subtle, soft ambient radial gradients — lowered intensity for text readability */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(30_58_138_/_0.12),transparent_65%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgb(12_74_110_/_0.09),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgb(29_78_216_/_0.06),transparent_55%)]" />

      {/* Gentle floating ambient light orbs with gentle blur and reduced opacity */}
      <div className="animate-float absolute -top-24 -left-24 size-[34rem] rounded-full bg-blue-500/10 blur-[130px]" />
      <div
        className="animate-float absolute top-1/3 -right-32 size-[30rem] rounded-full bg-sky-400/8 blur-[130px]"
        style={{ animationDelay: "-3s" }}
      />
      <div
        className="animate-float absolute -bottom-40 left-1/4 size-[36rem] rounded-full bg-indigo-500/8 blur-[140px]"
        style={{ animationDelay: "-4.5s" }}
      />

      <div className="animate-ping-slow absolute top-20 right-1/4 size-72 rounded-full bg-cyan-400/5 blur-[100px]" />
      <div
        className="animate-ping-slow absolute bottom-24 right-10 size-80 rounded-full bg-blue-500/5 blur-[110px]"
        style={{ animationDelay: "-0.8s" }}
      />
    </div>
  );
}
