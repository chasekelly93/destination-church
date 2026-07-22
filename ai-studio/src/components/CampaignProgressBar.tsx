import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const GOAL = 100000;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function CampaignProgressBar() {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .rpc("get_public_campaign_totals")
      .then(({ data }) => {
        const summary = data as unknown as { total_with_match: number } | null;
        setTotal(summary?.total_with_match ?? 0);
      });
  }, []);

  if (total === null) return null;

  const pct = Math.min((total / GOAL) * 100, 100);

  return (
    <div className="px-6 py-4 sm:px-8">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">{formatCurrency(total)} raised</span>
        <span className="text-muted-foreground">of {formatCurrency(GOAL)} goal</span>
      </div>
      <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-right text-xs text-muted-foreground">
        {pct.toFixed(0)}% of goal
      </p>
    </div>
  );
}
