import { BrandMark } from "./BrandMark";
import { Wordmark } from "./Wordmark";

type Props = {
  /** Height of the cake mark, as any CSS length (for example "2.6rem"). The wordmark scales with it. */
  size?: string;
  className?: string;
};

/** The full Maplecake logo: cake slice plus script wordmark. Use inside a link or heading. */
export function BrandLogo({ size = "2.6rem", className }: Props) {
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: "0.14em", fontSize: size, lineHeight: 0, color: "var(--ink)" }}>
      <BrandMark />
      <Wordmark />
    </span>
  );
}
