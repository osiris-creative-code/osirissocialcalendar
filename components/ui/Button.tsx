import { forwardRef } from "react";

type Variant = "primary" | "ghost" | "quiet" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-[var(--brand)] text-[var(--brand-ink)] border border-transparent hover:brightness-108",
  ghost:
    "bg-[var(--surface)] text-[var(--text)] border border-[var(--border-strong)] hover:border-[var(--brand)]",
  quiet: "bg-transparent text-[var(--text-dim)] border border-transparent hover:bg-[var(--surface-2)]",
  danger: "bg-[var(--accent)] text-white border border-transparent hover:brightness-108",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", className = "", type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-2 text-[13px] font-semibold transition disabled:opacity-60 disabled:pointer-events-none ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  );
});
