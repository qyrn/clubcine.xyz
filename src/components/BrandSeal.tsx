import circles from "@/lib/seal-circles.json";

const SEAL_VIEW = 720;

interface BrandSealProps {
  size?: number;
  color?: string;
  className?: string;
  ariaLabel?: string;
}

const CIRCLES = circles as [number, number, number][];

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
      <g fill={color}>
        {CIRCLES.map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} />
        ))}
      </g>
    </svg>
  );
}
