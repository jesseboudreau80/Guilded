import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  label?: string;
  showValue?: boolean;
  variant?: "default" | "brand" | "success" | "warning";
}

export function ProgressBar({
  value,
  max = 100,
  className,
  label,
  showValue = false,
  variant = "brand",
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.round((value / max) * 100));

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between">
          {label && <span className="text-sm text-gray-400">{label}</span>}
          {showValue && (
            <span className="text-sm font-medium text-white">
              {value}/{max}
            </span>
          )}
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-border">
        <div
          className={cn("h-full rounded-full transition-all duration-300", {
            "bg-brand-500": variant === "brand",
            "bg-gray-500": variant === "default",
            "bg-emerald-500": variant === "success",
            "bg-amber-500": variant === "warning",
          })}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
