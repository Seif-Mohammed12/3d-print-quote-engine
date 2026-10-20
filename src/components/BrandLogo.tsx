import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  /** Height of the cube mark in pixels; the name scales with it. */
  size?: number;
};

/** The cube mark (it spells "3D") with the name beside it. */
export default function BrandLogo({ className, size = 26 }: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <img src="/brand/mark-orange.svg" alt="" width={Math.round(size * 0.856)} height={size} className="shrink-0" style={{ height: size, width: "auto" }} />
      <span className="font-extrabold uppercase leading-none tracking-[-0.01em]" style={{ fontSize: Math.round(size * 0.66) }}>
        3D Print It
      </span>
    </span>
  );
}
