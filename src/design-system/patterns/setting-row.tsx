import type { LucideIcon } from "lucide-react";

export interface SettingRowProps {
  icon: LucideIcon;
  label: string;
  description: string;
  /** The control, usually a Switch. */
  children: React.ReactNode;
}

/** A labelled preference: icon, label, one-line description, and its control. */
export function SettingRow({ icon: Icon, label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <Icon className="h-4 w-4 text-text-secondary mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-text-primary">{label}</p>
          <p className="text-xs text-text-secondary mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
