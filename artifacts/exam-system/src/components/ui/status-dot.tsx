import "./status-dot.css";

export type StatusDotVariant = "green" | "amber" | "orange" | "red" | "gray" | "blue";
export type StatusDotSize = "sm" | "md" | "lg";

interface StatusDotProps {
  variant: StatusDotVariant;
  size?: StatusDotSize;
  className?: string;
}

export function StatusDot({ variant, size = "md", className = "" }: StatusDotProps) {
  return (
    <span
      className={`sdot sdot--${size} sdot--${variant} ${className}`}
      aria-hidden="true"
    />
  );
}

interface StatusBadgeProps {
  variant: StatusDotVariant;
  label: string;
  size?: StatusDotSize;
}

export function StatusBadge({ variant, label, size = "sm" }: StatusBadgeProps) {
  const colorMap: Record<StatusDotVariant, string> = {
    green:  "border-green-500/30  bg-green-500/10  text-green-600  dark:text-green-400",
    amber:  "border-amber-500/30  bg-amber-500/10  text-amber-600  dark:text-amber-400",
    orange: "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400",
    red:    "border-red-500/30    bg-red-500/10    text-red-600    dark:text-red-400",
    gray:   "border-border/50     bg-muted/40      text-muted-foreground",
    blue:   "border-blue-500/30   bg-blue-500/10   text-blue-600   dark:text-blue-400",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${colorMap[variant]}`}>
      <StatusDot variant={variant} size={size} />
      {label}
    </span>
  );
}
