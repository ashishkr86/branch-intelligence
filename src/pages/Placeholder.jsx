import { Construction } from "lucide-react";
import { EmptyState, Badge } from "../components/ui/primitives";

export default function Placeholder({ title, description, wave = "Wave 2" }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="accent">{wave} · Coming next</Badge>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">
          {title}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">{description}</p>
      </div>

      <EmptyState
        icon={Construction}
        title="This module is being built"
        description="The design system, layout shell, and navigation are complete. This page's content will be delivered in the next wave."
      />
    </div>
  );
}