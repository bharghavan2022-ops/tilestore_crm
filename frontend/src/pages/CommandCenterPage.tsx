import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "../components/layout/Topbar";
import { Card } from "../components/ui/Card";
import { KpiCard } from "../components/ui/KpiCard";
import { Badge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Spinner";
import { useCommandCenter, useCrmDashboard } from "../api/dashboard";
import { useShortages } from "../api/inventory";
import { useDeliveries } from "../api/logistics";
import { useQuotations } from "../api/quotations";
import { usePurchaseOrders } from "../api/purchaseOrders";
import { apiClient } from "../lib/apiClient";
import { formatInr } from "../lib/format";
import { useAuth } from "../auth/AuthContext";

function useFunnelCount(key: string, path: string, params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ["funnel", key, params],
    queryFn: async () => {
      const res = await apiClient.get<{ meta: { total: number } }>(path, { params: { pageSize: 1, ...params } });
      return res.data.meta.total;
    },
  });
}

export function CommandCenterPage() {
  const { user } = useAuth();
  const commandCenter = useCommandCenter();
  const crm = useCrmDashboard();
  const openShortages = useShortages({ status: "OPEN" });
  const delayedDeliveries = useDeliveries({ status: "DELAYED" });

  const leadsTotal = useFunnelCount("leads", "/leads");
  const quotesTotal = useFunnelCount("quotes", "/quotations");
  const confirmedTotal = useFunnelCount("confirmed", "/orders");
  const readyTotal = useFunnelCount("ready", "/orders", { status: "READY_FOR_DISPATCH" });

  const pendingApprovalQuotations = useQuotations({ status: "PENDING_APPROVAL" });
  const openPurchaseOrders = usePurchaseOrders({ status: "SENT" });
  const podPendingDeliveries = useDeliveries({ status: "DELIVERED" });

  const priorityShortage = openShortages.data?.[0];

  return (
    <>
      <Topbar title={`Good morning, ${user?.name?.split(" ")[0] ?? "Operations"}`} subtitle="Live view · Today" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Open orders"
          value={commandCenter.data ? commandCenter.data.ordersInProgress : <Spinner />}
        />
        <KpiCard
          label="Stock alerts"
          value={commandCenter.data ? commandCenter.data.openShortages : <Spinner />}
          hint={commandCenter.data && commandCenter.data.openShortages > 0 ? "Needs attention" : undefined}
          hintTone="critical"
        />
        <KpiCard
          label="Receivables"
          value={commandCenter.data ? formatInr(commandCenter.data.outstandingReceivables) : <Spinner />}
          hint="Outstanding across all invoices"
        />
        <KpiCard
          label="Approvals pending"
          value={commandCenter.data ? commandCenter.data.pendingApprovals : <Spinner />}
          hint={commandCenter.data && commandCenter.data.pendingApprovals > 0 ? "Awaiting decision" : undefined}
          hintTone="warning"
        />
      </div>

      <Card className="mt-4 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-text">Order control tower</h3>
          <span className="font-figures text-xs text-muted">CRM → QUOTE → ORDER → READY</span>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <FunnelStep label="Leads" value={leadsTotal.data} />
          <FunnelArrow />
          <FunnelStep label="Quotes" value={quotesTotal.data} />
          <FunnelArrow />
          <FunnelStep label="Confirmed" value={confirmedTotal.data} />
          <FunnelArrow />
          <FunnelStep label="Ready" value={readyTotal.data} />
        </div>

        {priorityShortage && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-status-warning-bg px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded bg-status-warning px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Priority
              </span>
              <span className="font-figures font-semibold text-ink-text">
                Order short by {priorityShortage.shortfallQuantity} units
              </span>
            </div>
            <Link to="/inventory" className="text-xs font-semibold text-status-warning hover:underline">
              Reserve warehouse · create demand · notify sales
            </Link>
          </div>
        )}
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-semibold text-ink-text">Live alerts</h3>
          </div>
          <ul className="divide-y divide-border">
            {openShortages.data?.slice(0, 2).map((s) => (
              <AlertRow key={s.id} tone="critical" title="Critical stock" detail={`${s.shortfallQuantity} units short`} />
            ))}
            {delayedDeliveries.data?.data.slice(0, 2).map((d) => (
              <AlertRow key={d.id} tone="warning" title="Truck delayed" detail={d.order.orderNumber} />
            ))}
            {podPendingDeliveries.data?.data
              .filter((d) => d.pod?.status === "PENDING")
              .slice(0, 2)
              .map((d) => (
                <AlertRow key={d.id} tone="neutral" title="POD pending" detail={`${d.order.orderNumber} · upload required`} />
              ))}
            {!openShortages.data?.length && !delayedDeliveries.data?.data.length && (
              <li className="px-5 py-6 text-center text-sm text-muted">No active alerts</li>
            )}
          </ul>
        </Card>

        <Card>
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-semibold text-ink-text">Lead status breakdown</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 p-5">
            {crm.data &&
              Object.entries(crm.data.byStatus).map(([status, count]) => (
                <div key={status} className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted">{status.replace(/_/g, " ")}</p>
                  <p className="font-figures text-xl font-semibold text-ink-text">{count}</p>
                </div>
              ))}
          </div>
        </Card>

        <Card>
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-semibold text-ink-text">My work queue</h3>
          </div>
          <ul className="divide-y divide-border text-sm">
            <WorkQueueRow label="Approvals" value={pendingApprovalQuotations.data?.meta.total} to="/crm" />
            <WorkQueueRow label="PO pending vendor reply" value={openPurchaseOrders.data?.meta.total} to="/purchasing" />
            <WorkQueueRow label="Open stock shortages" value={openShortages.data?.length} to="/inventory" />
          </ul>
        </Card>
      </div>
    </>
  );
}

function FunnelStep({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="text-center">
      <p className="font-figures text-3xl font-bold text-ink-text">{value ?? <Spinner />}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}

function FunnelArrow() {
  return <span className="text-xl text-border">→</span>;
}

function AlertRow({ tone, title, detail }: { tone: "critical" | "warning" | "neutral"; title: string; detail: string }) {
  return (
    <li className="flex items-center justify-between gap-3 px-5 py-3">
      <div>
        <p className="text-sm font-medium text-ink-text">{title}</p>
        <p className="font-figures text-xs text-muted">{detail}</p>
      </div>
      <Badge tone={tone}>{tone === "critical" ? "Critical" : tone === "warning" ? "Warning" : "Info"}</Badge>
    </li>
  );
}

function WorkQueueRow({ label, value, to }: { label: string; value: number | undefined; to: string }) {
  return (
    <li className="flex items-center justify-between px-5 py-3.5">
      <Link to={to} className="text-ink-text hover:text-brass-dark">
        {label}
      </Link>
      <span className="font-figures font-semibold text-ink-text">{value ?? <Spinner />}</span>
    </li>
  );
}
