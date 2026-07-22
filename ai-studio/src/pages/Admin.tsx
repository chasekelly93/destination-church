import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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
  amount: number;
  created_at: string;
};

type Summary = {
  pledge_count: number;
  individual_total: number;
  total_with_match: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);
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
      .select("full_name, email, phone, amount, created_at")
      .is("cancelled_at", null)
      .order("created_at", { ascending: false })
      .then(({ data }) => setPledges(data || []));

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
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Pledge Campaign Dashboard
          {devAuthorized && (
            <span className="ml-2 rounded bg-yellow-100 px-2 py-1 text-xs font-normal text-yellow-800">
              Dev mode
            </span>
          )}
        </h1>
        <Button variant="outline" onClick={handleSignOut}>
          Sign out
        </Button>
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
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {pledges.map((pledge) => (
                <tr key={pledge.email} className="border-b last:border-0">
                  <td className="px-4 py-2">{pledge.full_name}</td>
                  <td className="px-4 py-2">{pledge.email}</td>
                  <td className="px-4 py-2">{pledge.phone}</td>
                  <td className="px-4 py-2">{formatCurrency(Number(pledge.amount))}</td>
                  <td className="px-4 py-2">
                    {new Date(pledge.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onCancelPledge(pledge.email)}
                      disabled={cancellingEmail === pledge.email}
                      className="text-xs text-destructive underline disabled:opacity-50"
                    >
                      {cancellingEmail === pledge.email ? "Removing…" : "Remove"}
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
    </div>
  );
};

export default Admin;
