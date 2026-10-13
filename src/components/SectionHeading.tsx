import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: ReactNode;
  /** Kept for older call sites; headings are never gradient. */
  gradient?: boolean;
  as?: "h1" | "h2";
}

/** Page or section title: left-aligned, set large, one plain line under it. */
const SectionHeading = ({ title, subtitle, as: Tag = "h1" }: Props) => (
  <div className="mb-8 md:mb-12">
    <Tag className="text-[36px] font-bold leading-[1] tracking-[-0.035em] md:text-[56px]">{title}</Tag>
    {subtitle ? <p className="mt-3 max-w-xl text-muted-foreground md:text-lg">{subtitle}</p> : null}
  </div>
);

export default SectionHeading;
