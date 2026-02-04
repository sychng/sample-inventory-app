export default function MyLoans() {
  return (
    <div className="rounded-3xl border bg-white p-6 shadow-sm">
      <div className="text-lg font-semibold tracking-tight">My Loans</div>
      <div className="mt-2 text-sm text-zinc-600">
        This view needs a backend endpoint to list your active loans (e.g. GET /loans).
      </div>
      <div className="mt-3 text-xs text-zinc-500">
        For now, you can loan/return from the Samples page.
      </div>
    </div>
  );
}
