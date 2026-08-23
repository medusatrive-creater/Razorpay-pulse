"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { usePolling } from "@/lib/usePolling";
import { TxnStatusBadge } from "@/components/Badges";
import { LoadingBlock, ErrorBlock, EmptyBlock } from "@/components/States";
import { Search } from "lucide-react";

export default function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetcher = useCallback(() => {
    const params: Record<string, string> = { limit: "200" };
    if (search) params.search = search;
    if (methodFilter) params.payment_method = methodFilter;
    if (statusFilter) params.status = statusFilter;
    return api.transactions(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, methodFilter, statusFilter]);

  const { data: txns, error } = usePolling(fetcher, 3000);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-xl font-semibold text-text-primary">Live Transaction Monitor</h1>
        <p className="text-sm text-text-muted">Search and filter live payment traffic. Click a row to open its Payment Journey.</p>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transaction ID or error code…"
            className="w-full rounded-md border border-line bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-faint focus:border-pulse"
          />
        </div>
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-text-primary"
        >
          <option value="">All methods</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
          <option value="netbanking">Netbanking</option>
          <option value="wallet">Wallet</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-text-primary"
        >
          <option value="">All statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {error && <ErrorBlock message={error} />}
      {!error && !txns && <LoadingBlock />}
      {!error && txns && txns.length === 0 && <EmptyBlock title="No transactions match" hint="Try clearing filters." />}

      {!error && txns && txns.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface shadow-card">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-text-faint">
                <th className="px-4 py-3 font-medium">Transaction</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Region</th>
                <th className="px-4 py-3 font-medium">Device</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Latency</th>
                <th className="px-4 py-3 font-medium">Error</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[13px]">
              {txns.map((t) => (
                <tr key={t.transaction_id} className="border-b border-line-soft last:border-0 hover:bg-surface-raised">
                  <td className="px-4 py-2.5">
                    <Link href={`/transactions/${t.transaction_id}`} className="text-pulse-bright hover:underline">
                      {t.transaction_id}
                    </Link>
                    <div className="text-[11px] text-text-faint">{new Date(t.timestamp).toLocaleTimeString()}</div>
                  </td>
                  <td className="px-4 py-2.5 text-text-primary">₹{t.amount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-2.5 uppercase text-text-muted">{t.payment_method}</td>
                  <td className="px-4 py-2.5 text-text-muted">{t.region}</td>
                  <td className="px-4 py-2.5 text-text-muted">{t.device}</td>
                  <td className="px-4 py-2.5">
                    <TxnStatusBadge status={t.status} />
                  </td>
                  <td className={`px-4 py-2.5 ${t.total_latency_ms > 900 ? "text-signal-warning" : "text-text-primary"}`}>
                    {t.total_latency_ms}ms
                  </td>
                  <td className="px-4 py-2.5 text-signal-critical">{t.error_code || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
