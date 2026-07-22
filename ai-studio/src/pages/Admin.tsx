import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
});
type LoginValues = z.infer<typeof loginSchema>;

const devLoginSchema = z.object({
  password: z.string().min(1, "Enter the dev password"),
});
type DevLoginValues = z.infer<typeof devLoginSchema>;

const addAdminSchema = z.object({
  email: z.string().email("Enter a valid email"),
});
type AddAdminValues = z.infer<typeof addAdminSchema>;

type Pledge = {
  full_name: string;
  email: string;
  phone: string;
  amount: number | null;
  created_at: string;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  fulfillment_method: "monthly" | "one_time" | "other" | null;
  fulfillment_date: string | null;
  fulfillment_other_detail: string | null;
  includes_non_cash_gift: boolean;
  non_cash_gift_detail: string | null;
  has_questions: boolean;
};

type Summary = {
  pledge_count: number;
  individual_total: number;
  total_with_match: number;
};

const PLEDGE_COLUMNS =
  "full_name, email, phone, amount, created_at, street_address, city, state, zip, " +
  "fulfillment_method, fulfillment_date, fulfillment_other_detail, " +
  "includes_non_cash_gift, non_cash_gift_detail, has_questions";

function formatCurrency(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatAddress(p: Pledge) {
  const cityStateZip = [p.city, p.state].filter(Boolean).join(", ") + (p.zip ? ` ${p.zip}` : "");
  const parts = [p.street_address, cityStateZip.trim()].filter((part) => part && part.length > 0);
  return parts.length ? parts.join(" · ") : "—";
}

function formatFulfillment(p: Pledge) {
  if (p.has_questions) return "Has questions — no plan yet";
  if (p.fulfillment_method === "monthly") return "Equal monthly amounts over 4 months";
  if (p.fulfillment_method === "one_time") {
    return `One-time gift${p.fulfillment_date ? ` on ${p.fulfillment_date}` : ""}`;
  }
  if (p.fulfillment_method === "other") return p.fulfillment_other_detail || "Other";
  return "—";
}

function csvEscape(value: string | number | boolean | null) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadPledgesCsv(pledges: Pledge[]) {
  const headers = [
    "Full Name",
    "Email",
    "Phone",
    "Street Address",
    "City",
    "State",
    "Zip",
    "Amount",
    "Fulfillment Method",
    "Fulfillment Date",
    "Fulfillment Other Detail",
    "Includes Non-Cash Gift",
    "Non-Cash Gift Detail",
    "Has Questions",
    "Created At",
  ];

  const rows = pledges.map((p) =>
    [
      p.full_name,
      p.email,
      p.phone,
      p.street_address,
      p.city,
      p.state,
      p.zip,
      p.amount,
      p.fulfillment_method,
      p.fulfillment_date,
      p.fulfillment_other_detail,
      p.includes_non_cash_gift,
      p.non_cash_gift_detail,
      p.has_questions,
      p.created_at,
    ]
      .map(csvEscape)
      .join(","),
  );

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pledges-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const Admin = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [linkSent, setLinkSent] = useState(false);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [admins, setAdmins] = useState<string[]>([]);
  const [showDevLogin, setShowDevLogin] = useState(false);
  const [devAuthorized, setDevAuthorized] = useState(false);
  const [devPassword, setDevPassword] = useState<string | null>(null);
  const [cancellingEmail, setCancellingEmail] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [detailsPledge, setDetailsPledge] = useState<Pledge | null>(null);
  const [pledgeToDelete, setPledgeToDelete] = useState<Pledge | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const {
    register: registerDevLogin,
    handleSubmit: handleSubmitDevLogin,
    formState: { errors: devLoginErrors, isSubmitting: isDevLoggingIn },
  } = useForm<DevLoginValues>({ resolver: zodResolver(devLoginSchema) });

  const {
    register: registerAddAdmin,
    handleSubmit: handleSubmitAddAdmin,
    reset: resetAddAdmin,
    formState: { errors: addAdminErrors, isSubmitting: isAddingAdmin },
  } = useForm<AddAdminValues>({ resolver: zodResolver(addAdminSchema) });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const loadRealDashboard = () => {
    supabase
      .from("pledges")
      .select(PLEDGE_COLUMNS)
      .is("cancelled_at", null)
      .order("created_at", { ascending: false })
      .then(({ data }) => setPledges((data as Pledge[]) || []));

    supabase
      .from("pledge_summary")
      .select("*")
      .single()
      .then(({ data }) => setSummary(data));

    supabase
      .from("admin_allowlist")
      .select("email")
      .order("email", { ascending: true })
      .then(({ data }) => setAdmins((data || []).map((row) => row.email)));
  };

  useEffect(() => {
    if (!session) return;
    loadRealDashboard();
  }, [session]);

  const onLogin = async (values: LoginValues) => {
    setLinkSent(false);
    const { error } = await supabase.auth.signInWithOtp({
      email: values.email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    });

    if (!error) {
      setLinkSent(true);
      return;
    }

    toast.error(error.message);
  };

  const loadDevDashboard = async (password: string) => {
    const { data, error } = await supabase.rpc("dev_get_dashboard", {
      p_password: password,
    });

    if (error) {
      toast.error("Wrong dev password.");
      return false;
    }

    const result = data as { pledges: Pledge[]; summary: Summary; admins: string[] };
    setPledges(result.pledges || []);
    setSummary(result.summary || null);
    setAdmins(result.admins || []);
    return true;
  };

  const onDevLogin = async (values: DevLoginValues) => {
    const ok = await loadDevDashboard(values.password);
    if (ok) {
      setDevPassword(values.password);
      setDevAuthorized(true);
    }
  };

  const onAddAdmin = async (values: AddAdminValues) => {
    const email = values.email.trim().toLowerCase();

    if (devAuthorized && devPassword) {
      const { error } = await supabase.rpc("dev_add_admin", {
        p_password: devPassword,
        p_email: email,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(`${email} can now log into this dashboard.`);
      resetAddAdmin();
      loadDevDashboard(devPassword);
      return;
    }

    const { error } = await supabase.from("admin_allowlist").insert({ email });

    if (!error) {
      toast.success(`${email} can now log into this dashboard.`);
      resetAddAdmin();
      loadRealDashboard();
      return;
    }

    if (error.code === "23505") {
      toast.error(`${email} is already an admin.`);
      return;
    }

    toast.error(error.message);
  };

  const onCancelPledge = async (email: string) => {
    setCancellingEmail(email);
    const { error } = await supabase.rpc("cancel_pledge", {
      p_email: email,
      p_dev_password: devAuthorized ? devPassword : null,
    });
    setCancellingEmail(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`Removed ${email}'s pledge.`);
    if (devAuthorized && devPassword) {
      loadDevDashboard(devPassword);
    } else {
      loadRealDashboard();
    }
  };

  const handleConfirmDelete = async () => {
    if (!pledgeToDelete) return;
    await onCancelPledge(pledgeToDelete.email);
    setPledgeToDelete(null);
    setDeleteConfirmText("");
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (devAuthorized && devPassword) {
      await loadDevDashboard(devPassword);
    } else {
      loadRealDashboard();
    }
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setDevAuthorized(false);
    setDevPassword(null);
    setPledges([]);
    setSummary(null);
    setAdmins([]);
  };

  if (checkingSession) {
    return null;
  }

  if (!session && !devAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>
              Enter your email to receive a sign-in link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {linkSent ? (
              <p className="rounded-md bg-muted p-3 text-sm">
                Check your email for a sign-in link.
              </p>
            ) : (
              <form onSubmit={handleSubmit(onLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Sending…" : "Send sign-in link"}
                </Button>
              </form>
            )}

            <div className="mt-4 border-t pt-4">
              <button
                type="button"
                onClick={() => setShowDevLogin((v) => !v)}
                className="text-xs text-muted-foreground underline"
              >
                {showDevLogin ? "Hide dev login" : "Use dev password instead"}
              </button>

              {showDevLogin && (
                <form
                  onSubmit={handleSubmitDevLogin(onDevLogin)}
                  className="mt-3 space-y-3"
                >
                  <div className="space-y-2">
                    <Label htmlFor="dev-password">Dev password</Label>
                    <Input
                      id="dev-password"
                      type="password"
                      {...registerDevLogin("password")}
                    />
                    {devLoginErrors.password && (
                      <p className="text-sm text-destructive">
                        {devLoginErrors.password.message}
                      </p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full"
                    disabled={isDevLoggingIn}
                  >
                    {isDevLoggingIn ? "Checking…" : "Dev login"}
                  </Button>
                </form>
              )}
            </div>

            <p className="mt-4 text-center">
              <Link to="/" className="text-xs text-muted-foreground underline underline-offset-2">
                New Pledge
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const deleteConfirmed = deleteConfirmText.trim().toLowerCase() === "delete";

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">
          Pledge Campaign Dashboard
          {devAuthorized && (
            <span className="ml-2 rounded bg-yellow-100 px-2 py-1 text-xs font-normal text-yellow-800">
              Dev mode
            </span>
          )}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/">New Pledge</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => downloadPledgesCsv(pledges)}
            disabled={pledges.length === 0}
          >
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
          <Button variant="outline" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pledges</p>
            <p className="mt-1 text-2xl font-bold">{summary?.pledge_count ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Individual Total</p>
            <p className="mt-1 text-2xl font-bold">
              {formatCurrency(summary?.individual_total ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total With Church Match</p>
            <p className="mt-1 text-2xl font-bold">
              {formatCurrency(summary?.total_with_match ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <h2 className="mt-10 mb-4 text-lg font-semibold">Pledges by Person</h2>

      {pledges.length === 0 ? (
        <p className="text-muted-foreground">
          No pledges to show yet. If you expect data here, confirm your email
          has been added to <code>admin_allowlist</code>.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Pledged</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Flags</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {pledges.map((pledge) => (
                <tr key={pledge.email} className="border-b last:border-0">
                  <td className="px-4 py-2">{pledge.full_name}</td>
                  <td className="px-4 py-2">{pledge.email}</td>
                  <td className="px-4 py-2">{pledge.phone}</td>
                  <td className="px-4 py-2">{formatCurrency(pledge.amount)}</td>
                  <td className="px-4 py-2">
                    {new Date(pledge.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {pledge.has_questions && (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                          Questions
                        </span>
                      )}
                      {pledge.includes_non_cash_gift && (
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                          Non-cash
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setDetailsPledge(pledge)}
                      className="mr-3 text-xs text-muted-foreground underline"
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPledgeToDelete(pledge);
                        setDeleteConfirmText("");
                      }}
                      className="text-xs text-destructive underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-10 mb-4 text-lg font-semibold">Admin Access</h2>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <p className="mb-2 text-sm text-muted-foreground">
              Currently allowed to log in:
            </p>
            <ul className="space-y-1 text-sm">
              {admins.map((email) => (
                <li key={email}>{email}</li>
              ))}
            </ul>
          </div>

          <form
            onSubmit={handleSubmitAddAdmin(onAddAdmin)}
            className="flex items-end gap-2"
          >
            <div className="flex-1 space-y-2">
              <Label htmlFor="new-admin-email">Add an admin</Label>
              <Input
                id="new-admin-email"
                type="email"
                placeholder="newadmin@example.com"
                {...registerAddAdmin("email")}
              />
              {addAdminErrors.email && (
                <p className="text-sm text-destructive">{addAdminErrors.email.message}</p>
              )}
            </div>
            <Button type="submit" disabled={isAddingAdmin}>
              {isAddingAdmin ? "Adding…" : "Add"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Dialog open={!!detailsPledge} onOpenChange={(open) => !open && setDetailsPledge(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detailsPledge?.full_name}</DialogTitle>
            <DialogDescription>{detailsPledge?.email}</DialogDescription>
          </DialogHeader>
          {detailsPledge && (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Address</p>
                <p>{formatAddress(detailsPledge)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Fulfillment plan</p>
                <p>{formatFulfillment(detailsPledge)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Non-cash gift</p>
                <p>
                  {detailsPledge.includes_non_cash_gift
                    ? detailsPledge.non_cash_gift_detail || "Yes, no detail given"
                    : "No"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Has questions</p>
                <p>{detailsPledge.has_questions ? "Yes — needs follow-up" : "No"}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!pledgeToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setPledgeToDelete(null);
            setDeleteConfirmText("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove pledge?</DialogTitle>
            <DialogDescription>
              This removes {pledgeToDelete?.full_name}'s pledge ({pledgeToDelete?.email})
              from the dashboard and totals. The record itself is kept, not deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-confirm">Type "delete" to confirm</Label>
            <Input
              id="delete-confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPledgeToDelete(null);
                setDeleteConfirmText("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={!deleteConfirmed || cancellingEmail === pledgeToDelete?.email}
              className={
                deleteConfirmed
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-red-200 text-red-900 hover:bg-red-200 cursor-not-allowed"
              }
            >
              {cancellingEmail === pledgeToDelete?.email ? "Removing…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
