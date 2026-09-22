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
import { useDeliveries } from "../api/logistics";
import { statusTone, humanizeStatus } from "../lib/statusTone";
import { formatDateTime } from "../lib/format";
import { NewDeliveryModal } from "../components/logistics/NewDeliveryModal";

function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export function LogisticsPage() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const deliveries = useDeliveries();

  const stats = useMemo(() => {
    const rows = deliveries.data?.data ?? [];
    return {
      active: rows.filter((d) => d.status === "IN_TRANSIT" || d.status === "DELAYED").length,
      deliveredToday: rows.filter((d) => d.status !== "PENDING_DISPATCH" && d.status !== "IN_TRANSIT" && isToday(d.deliveredAt)).length,
      delayed: rows.filter((d) => d.status === "DELAYED").length,
      podPending: rows.filter((d) => d.pod?.status === "PENDING" && d.deliveredAt).length,
    };
  }, [deliveries.data]);

  return (
    <>
      <Topbar title="Logistics Tracker" subtitle="Live view · All routes" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Trucks active" value={deliveries.data ? stats.active : <Spinner />} />
        <KpiCard label="Delivered today" value={deliveries.data ? stats.deliveredToday : <Spinner />} hintTone="success" />
        <KpiCard label="Delayed" value={deliveries.data ? stats.delayed : <Spinner />} hintTone="critical" />
        <KpiCard label="POD pending" value={deliveries.data ? stats.podPending : <Spinner />} hintTone="warning" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-ink-text">Delivery tracker</h3>
              <p className="mt-0.5 text-xs text-muted">Truck plan · live tracking · delivery · POD</p>
            </div>
            <Button onClick={() => setModalOpen(true)}>New delivery</Button>
          </div>

          {deliveries.isLoading ? (
            <div className="p-10 text-center"><Spinner className="mx-auto h-6 w-6" /></div>
          ) : deliveries.data?.data.length ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Destination</Th>
                  <Th>ETA</Th>
                  <Th>Status</Th>
                </tr>
              </Thead>
              <Tbody>
                {deliveries.data.data.map((d) => (
                  <Tr key={d.id} onClick={() => navigate(`/logistics/${d.id}`)}>
                    <Td className="font-figures font-medium">{d.order.orderNumber}</Td>
                    <Td>{d.destinationAddress}</Td>
                    <Td className="font-figures text-xs">{d.eta ? formatDateTime(d.eta) : "—"}</Td>
                    <Td>
                      <Badge tone={statusTone(d.status)}>{humanizeStatus(d.status)}</Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <EmptyState title="No deliveries scheduled" subtitle="Deliveries appear once an order is ready for dispatch" />
          )}
        </Card>

        <Card>
          <CardHeader title="Delay & POD alerts" />
          <ul className="divide-y divide-border">
            {deliveries.data?.data
              .filter((d) => d.status === "DELAYED")
              .map((d) => (
                <li key={d.id} className="px-5 py-3.5">
                  <p className="text-sm font-medium text-ink-text">{d.order.orderNumber} delayed</p>
                  <p className="text-xs text-muted">{d.delayEvents[0]?.reason ?? "No reason recorded"}</p>
                </li>
              ))}
            {deliveries.data?.data
              .filter((d) => d.pod?.status === "PENDING" && d.deliveredAt)
              .map((d) => (
                <li key={d.id} className="px-5 py-3.5">
                  <p className="text-sm font-medium text-ink-text">{d.order.orderNumber} POD required</p>
                  <p className="text-xs text-muted">Upload pending</p>
                </li>
              ))}
            {!stats.delayed && !stats.podPending && <EmptyState title="No alerts" />}
          </ul>
        </Card>
      </div>

      <NewDeliveryModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
