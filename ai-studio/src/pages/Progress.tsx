import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { BreakoutHeader } from "@/components/BreakoutHeader";
import { supabase } from "@/lib/supabase";

const GOAL = 200000;

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
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

// Smoothly animates a displayed number toward its real target whenever the
// target changes, so live updates feel like the total is "growing" rather
// than snapping to a new value.
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    const start = prevRef.current;
    const diff = target - start;
    if (diff === 0) return;

    const startTime = performance.now();
    let frame: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(start + diff * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        prevRef.current = target;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

const Progress = () => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [justUpdated, setJustUpdated] = useState(false);
  const prevTotalRef = useRef<number | null>(null);

  useEffect(() => {
    const loadTotals = () => {
      supabase
        .rpc("get_public_campaign_totals")
        .then(({ data }) => {
          setSummary((data as unknown as Summary) || null);
          setLoading(false);
        });
    };

    loadTotals();

    const channel = supabase
      .channel("campaign-updates")
      .on("broadcast", { event: "pledge_updated" }, loadTotals)
      .subscribe();

    const interval = setInterval(loadTotals, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!summary) return;
    const prev = prevTotalRef.current;
    if (prev !== null && summary.total_with_match > prev) {
      setJustUpdated(true);
      const t = setTimeout(() => setJustUpdated(false), 2200);
      prevTotalRef.current = summary.total_with_match;
      return () => clearTimeout(t);
    }
    prevTotalRef.current = summary.total_with_match;
  }, [summary]);

  const animatedTotal = useCountUp(summary?.total_with_match ?? 0);
  const animatedIndividual = useCountUp(summary?.individual_total ?? 0);
  const animatedMatch = useCountUp(summary?.church_match ?? 0);
  const animatedCount = useCountUp(summary?.pledge_count ?? 0, 600);

  const pct = Math.min((animatedTotal / GOAL) * 100, 100);

  return (
    <>
      {/* Mobile / tablet: compact card layout */}
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 lg:hidden">
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
                      {Math.round(animatedCount)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-muted-foreground">Individual Total</p>
                    <p className="mt-1 text-3xl font-bold">
                      {formatCurrency(animatedIndividual)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-muted-foreground">Church Match</p>
                    <p className="mt-1 text-3xl font-bold">
                      {formatCurrency(animatedMatch)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-primary">
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Total Toward $200,000 Goal
                    </p>
                    <p className="mt-1 text-4xl font-bold">
                      {formatCurrency(animatedTotal)}
                    </p>
                    <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-right text-xs text-muted-foreground">
                      {pct.toFixed(0)}%
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

      {/* Desktop / big screen: full-bleed hero display */}
      <div
        className="hidden min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary to-[hsl(var(--brand-navy))] px-16 py-16 text-primary-foreground lg:flex"
        style={{
          transition: "box-shadow 0.5s ease-out",
          boxShadow: justUpdated ? "inset 0 0 200px rgba(255,255,255,0.25)" : "inset 0 0 0 rgba(255,255,255,0)",
        }}
      >
        <h1 className="brand-wordmark text-7xl xl:text-8xl">BREAKOUT</h1>
        <p className="brand-wordmark mt-2 text-xl opacity-80 xl:text-2xl">
          SEPTEMBER - DECEMBER 2026
        </p>

        {loading ? (
          <p className="mt-20 text-2xl opacity-80">Loading…</p>
        ) : (
          <>
            <div className="mt-16 w-full max-w-4xl">
              <div className="flex items-end justify-between">
                <span className="text-2xl font-semibold opacity-90 xl:text-3xl">
                  Toward the Goal
                </span>
                <span className="text-xl opacity-70 xl:text-2xl">
                  Goal: {formatCurrency(GOAL)}
                </span>
              </div>
              <div className="mt-3 h-10 w-full overflow-hidden rounded-full bg-white/20 xl:h-12">
                <div
                  className="h-full rounded-full bg-white transition-all duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    boxShadow: justUpdated ? "0 0 40px rgba(255,255,255,0.9)" : "0 0 0 rgba(255,255,255,0)",
                    transitionProperty: "width, box-shadow",
                  }}
                />
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-6xl font-bold tabular-nums xl:text-7xl">
                  {formatCurrency(animatedTotal)}
                </span>
                <span className="text-3xl font-bold opacity-90 xl:text-4xl">
                  {pct.toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="mt-16 grid grid-cols-3 gap-16 text-center">
              <div>
                <p className="text-lg uppercase tracking-wide opacity-70 xl:text-xl">
                  Pledges
                </p>
                <p className="mt-2 text-5xl font-bold tabular-nums xl:text-6xl">
                  {Math.round(animatedCount)}
                </p>
              </div>
              <div>
                <p className="text-lg uppercase tracking-wide opacity-70 xl:text-xl">
                  Individual Total
                </p>
                <p className="mt-2 text-5xl font-bold tabular-nums xl:text-6xl">
                  {formatCurrency(animatedIndividual)}
                </p>
              </div>
              <div>
                <p className="text-lg uppercase tracking-wide opacity-70 xl:text-xl">
                  Church Match
                </p>
                <p className="mt-2 text-5xl font-bold tabular-nums xl:text-6xl">
                  {formatCurrency(animatedMatch)}
                </p>
              </div>
            </div>
          </>
        )}

        <Link
          to="/"
          className="mt-16 text-sm underline underline-offset-2 opacity-70 hover:opacity-100"
        >
          Make Your Pledge
        </Link>
      </div>
    </>
  );
};

export default Progress;
