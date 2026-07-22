import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { BreakoutHeader } from "@/components/BreakoutHeader";
import { supabase } from "@/lib/supabase";

type Summary = {
  pledge_count: number;
  individual_total: number;
  church_match: number;
  total_with_match: number;
};

function formatCurrency(value: number | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value ?? 0);
}

const Progress = () => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .rpc("get_public_campaign_totals")
      .then(({ data }) => {
        setSummary((data as unknown as Summary) || null);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-lg shadow-sm">
        <BreakoutHeader subtitle="CAMPAIGN PROGRESS" />
        <div className="rounded-b-lg bg-card p-6">
          {loading ? (
            <p className="text-center text-muted-foreground">Loading…</p>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">Pledges Received</p>
                  <p className="mt-1 text-3xl font-bold">
                    {summary?.pledge_count ?? 0}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">Individual Total</p>
                  <p className="mt-1 text-3xl font-bold">
                    {formatCurrency(summary?.individual_total)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">Church Match</p>
                  <p className="mt-1 text-3xl font-bold">
                    {formatCurrency(summary?.church_match)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-primary">
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Total Toward $100,000 Goal
                  </p>
                  <p className="mt-1 text-4xl font-bold">
                    {formatCurrency(summary?.total_with_match)}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <p className="mt-8 text-center">
        <Link to="/" className="text-xs text-muted-foreground underline underline-offset-2">
          Make Your Pledge
        </Link>
      </p>
    </div>
  );
};

export default Progress;
