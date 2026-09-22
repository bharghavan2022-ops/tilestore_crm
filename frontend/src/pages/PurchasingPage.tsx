import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Topbar } from "../components/layout/Topbar";
import { Card, CardHeader } from "../components/ui/Card";
import { KpiCard } from "../components/ui/KpiCard";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Table, Thead, Th, Tbody, Tr, Td } from "../components/ui/Table";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { usePurchaseOrders } from "../api/purchaseOrders";
import { usePurchaseTrackingDashboard } from "../api/dashboard";
import { statusTone, humanizeStatus } from "../lib/statusTone";
import { formatFullInr, formatDate } from "../lib/format";
import { NewPurchaseOrderModal } from "../components/purchasing/NewPurchaseOrderModal";

export function PurchasingPage() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const purchaseOrders = usePurchaseOrders();
  const dashboard = usePurchaseTrackingDashboard();

  const openCount = useMemo(
    () => purchaseOrders.data?.data.filter((po) => !["RECEIVED", "CANCELLED"].includes(po.status)).length ?? 0,
    [purchaseOrders.data],
  );

  const totalValue = useMemo(() => {
    if (!purchaseOrders.data) return null;
    return purchaseOrders.data.data.reduce(
      (sum, po) => sum + po.items.reduce((s, item) => s + Number(item.quantityOrdered) * Number(item.unitCost), 0),
      0,
    );
  }, [purchaseOrders.data]);

  const vendorBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const po of purchaseOrders.data?.data ?? []) {
      if (["RECEIVED", "CANCELLED"].includes(po.status)) continue;
      map.set(po.vendor.name, (map.get(po.vendor.name) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [purchaseOrders.data]);

  return (
    <>
      <Topbar title="Purchase Tracking" subtitle="Live view · All vendors" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Open POs" value={purchaseOrders.data ? openCount : <Spinner />} />
        <KpiCard label="Pending confirmation" value={dashboard.data?.byStatus.SENT ?? 0} hintTone="warning" />
        <KpiCard
          label="Overdue ETAs"
          value={dashboard.data ? dashboard.data.overdue.length : <Spinner />}
          hintTone="critical"
        />
        <KpiCard label="Total open PO value" value={totalValue !== null ? formatFullInr(totalValue) : <Spinner />} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-ink-text">Purchase order tracker</h3>
              <p className="mt-0.5 text-xs text-muted">PO · vendor · quantity · ETA</p>
            </div>
            <Button onClick={() => setModalOpen(true)}>New PO</Button>
          </div>

          {purchaseOrders.isLoading ? (
            <div className="p-10 text-center"><Spinner className="mx-auto h-6 w-6" /></div>
          ) : purchaseOrders.data?.data.length ? (
            <Table>
              <Thead>
                <tr>
                  <Th>PO #</Th>
                  <Th>Vendor</Th>
                  <Th>ETA</Th>
                  <Th>Status</Th>
                </tr>
              </Thead>
              <Tbody>
                {purchaseOrders.data.data.map((po) => (
                  <Tr key={po.id} onClick={() => navigate(`/purchasing/${po.id}`)}>
                    <Td className="font-figures font-medium">{po.poNumber}</Td>
                    <Td>{po.vendor.name}</Td>
                    <Td className="font-figures text-xs">{po.expectedAt ? formatDate(po.expectedAt) : "—"}</Td>
                    <Td>
                      <Badge tone={statusTone(po.status)}>{humanizeStatus(po.status)}</Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <EmptyState title="No purchase orders yet" />
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Open POs by vendor" />
            {vendorBreakdown.length ? (
              <ul className="divide-y divide-border">
                {vendorBreakdown.map(([vendor, count]) => (
                  <li key={vendor} className="flex items-center justify-between px-5 py-3.5 text-sm">
                    <span className="text-ink-text">{vendor}</span>
                    <span className="font-figures font-semibold text-ink-text">{count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No open purchase orders" />
            )}
          </Card>

          {dashboard.data && dashboard.data.overdue.length > 0 && (
            <Card>
              <CardHeader title="Overdue" />
              <ul className="divide-y divide-border">
                {dashboard.data.overdue.map((po) => (
                  <li key={po.id} className="px-5 py-3.5 text-sm">
                    <p className="font-figures font-medium text-ink-text">{po.poNumber}</p>
                    <p className="text-xs text-muted">{po.vendor.name}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <NewPurchaseOrderModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
