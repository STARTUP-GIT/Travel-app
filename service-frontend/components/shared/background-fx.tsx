import { cn } from "@/lib/utils";

/**
 * Decorative backdrop shared by the auth screens. Only the animation utilities
 * that actually exist in globals.css are used (`animate-float`, `animate-ping-slow`)
 * so nothing here depends on a class that was never defined.
 */
export function BackgroundFX({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(30_58_138_/_0.5),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgb(12_74_110_/_0.45),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgb(29_78_216_/_0.28),transparent_50%)]" />

      <div className="animate-float absolute -top-24 -left-24 size-[34rem] rounded-full bg-blue-600/20 blur-[120px]" />
      <div
        className="animate-float absolute top-1/3 -right-32 size-[30rem] rounded-full bg-sky-500/18 blur-[120px]"
        style={{ animationDelay: "-3s" }}
      />
      <div
        className="animate-float absolute -bottom-40 left-1/4 size-[36rem] rounded-full bg-indigo-600/18 blur-[130px]"
        style={{ animationDelay: "-4.5s" }}
      />

      <div className="animate-ping-slow absolute top-20 right-1/4 size-72 rounded-full bg-cyan-400/10 blur-[90px]" />
      <div
        className="animate-ping-slow absolute bottom-24 right-10 size-80 rounded-full bg-blue-500/10 blur-[100px]"
        style={{ animationDelay: "-0.8s" }}
      />
    </div>
  );
}
