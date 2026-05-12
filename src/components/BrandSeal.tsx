import circles from "@/lib/seal-circles.json";

const SEAL_VIEW = 720;

const CIRCLES_HTML = (circles as [number, number, number][])
  .map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`)
  .join("");

interface BrandSealProps {
  size?: number;
  color?: string;
  className?: string;
  ariaLabel?: string;
}

export default function BrandSeal({
  size = 32,
  color = "#fff",
  className,
  ariaLabel = "club ciné · sceau",
}: BrandSealProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${SEAL_VIEW} ${SEAL_VIEW}`}
      className={className}
      role="img"
      aria-label={ariaLabel}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill={color} dangerouslySetInnerHTML={{ __html: CIRCLES_HTML }} />
    </svg>
  );
}
