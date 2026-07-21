import { createClient } from "@/lib/supabase/server";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [{ data: pledges }, { data: summary }] = await Promise.all([
    supabase
      .from("pledges")
      .select("full_name, email, phone, amount, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("pledge_summary").select("*").single(),
  ]);

  const individualTotal = summary?.individual_total ?? 0;
  const totalWithMatch = summary?.total_with_match ?? 0;
  const pledgeCount = summary?.pledge_count ?? 0;

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Pledge Campaign Dashboard</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Pledges</p>
          <p className="mt-1 text-2xl font-semibold">{pledgeCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Individual Total</p>
          <p className="mt-1 text-2xl font-semibold">
            {formatCurrency(individualTotal)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Total With Church Match</p>
          <p className="mt-1 text-2xl font-semibold">
            {formatCurrency(totalWithMatch)}
          </p>
        </div>
      </div>

      <h2 className="mt-10 text-lg font-semibold">Pledges by Person</h2>

      {!pledges || pledges.length === 0 ? (
        <p className="mt-4 text-slate-600">
          No pledges to show yet. If you expect data here, confirm your
          email has been added to <code>admin_allowlist</code>.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Pledged</th>
                <th className="px-4 py-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pledges.map((pledge) => (
                <tr key={pledge.email}>
                  <td className="px-4 py-2">{pledge.full_name}</td>
                  <td className="px-4 py-2">{pledge.email}</td>
                  <td className="px-4 py-2">{pledge.phone}</td>
                  <td className="px-4 py-2">
                    {formatCurrency(Number(pledge.amount))}
                  </td>
                  <td className="px-4 py-2">
                    {new Date(pledge.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
