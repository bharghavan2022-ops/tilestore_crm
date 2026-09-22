import { useParams } from "react-router-dom";
import { Topbar } from "../components/layout/Topbar";
import { Card, CardHeader } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Table, Thead, Th, Tbody, Tr, Td } from "../components/ui/Table";
import { FullScreenSpinner } from "../components/ui/Spinner";
import { EmptyState } from "../components/ui/EmptyState";
import { useCancelOrder, useOrder, useRerunStockGate, useUpdateFulfilmentTask } from "../api/orders";
import { statusTone, humanizeStatus } from "../lib/statusTone";
import { formatFullInr, formatQty } from "../lib/format";
import { useToast } from "../components/ui/Toast";
import { getApiErrorMessage } from "../lib/apiClient";

const STAGE_ORDER = ["PICK", "PACK", "LABEL", "HANDOFF"];

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { notify } = useToast();
  const order = useOrder(orderId);
  const rerunStockGate = useRerunStockGate(orderId!);
  const cancelOrder = useCancelOrder(orderId!);
  const updateTask = useUpdateFulfilmentTask(orderId!);

  if (order.isLoading) return <FullScreenSpinner />;
  if (!order.data) return <EmptyState title="Order not found" />;

  const o = order.data;
  const canCancel = !["DISPATCHED", "DELIVERED", "CLOSED", "CANCELLED"].includes(o.status);
  const sortedTasks = [...o.fulfilmentTasks].sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage));

  async function handleTaskComplete(taskId: string) {
    try {
      await updateTask.mutateAsync({ taskId, status: "COMPLETED" });
      notify("Task marked complete");
    } catch (err) {
      notify(getApiErrorMessage(err), "error");
    }
  }

  async function handleRerun() {
    try {
      await rerunStockGate.mutateAsync();
      notify("Stock gate re-evaluated");
    } catch (err) {
      notify(getApiErrorMessage(err), "error");
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel this order? Any reserved stock will be released.")) return;
    try {
      await cancelOrder.mutateAsync();
      notify("Order cancelled");
    } catch (err) {
      notify(getApiErrorMessage(err), "error");
    }
  }

  return (
    <>
      <Topbar title={o.orderNumber} subtitle={o.customer.name} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge tone={statusTone(o.status)}>{humanizeStatus(o.status)}</Badge>
        <Button variant="secondary" loading={rerunStockGate.isPending} onClick={handleRerun}>
          Re-run stock gate
        </Button>
        {canCancel && (
          <Button variant="danger" loading={cancelOrder.isPending} onClick={handleCancel}>
            Cancel order
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Order items" />
            <Table>
              <Thead>
                <tr>
                  <Th>Product</Th>
                  <Th>Qty</Th>
                  <Th>Reserved</Th>
                  <Th>Shortfall</Th>
                  <Th>Line total</Th>
                </tr>
              </Thead>
              <Tbody>
                {o.items.map((item) => (
                  <Tr key={item.id}>
                    <Td>
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-xs text-muted">{item.product.sku}</p>
                    </Td>
                    <Td className="font-figures">{formatQty(item.quantity)}</Td>
                    <Td className="font-figures">{formatQty(item.reservedQuantity)}</Td>
                    <Td className="font-figures">
                      {Number(item.shortfallQuantity) > 0 ? (
                        <span className="text-status-critical">{formatQty(item.shortfallQuantity)}</span>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td className="font-figures font-semibold">{formatFullInr(item.lineTotal)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            <div className="border-t border-border px-5 py-4 text-right">
              <span className="text-sm text-muted">Grand total: </span>
              <span className="font-figures text-base font-semibold text-ink-text">{formatFullInr(o.grandTotal)}</span>
            </div>
          </Card>

          <Card>
            <CardHeader title="Fulfilment" subtitle="Pick → Pack → Label → Handoff" />
            <ul className="divide-y divide-border">
              {sortedTasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-ink-text">{humanizeStatus(task.stage)}</p>
                    {task.notes && <p className="text-xs text-muted">{task.notes}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={statusTone(task.status)}>{humanizeStatus(task.status)}</Badge>
                    {task.status !== "COMPLETED" && (
                      <Button
                        variant="secondary"
                        loading={updateTask.isPending}
                        onClick={() => handleTaskComplete(task.id)}
                      >
                        Mark complete
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {o.shortages.length > 0 && (
            <Card>
              <CardHeader title="Shortages" subtitle="Unresolved gaps on this order" />
              <ul className="divide-y divide-border">
                {o.shortages.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-5 py-3.5 text-sm">
                    <span>{formatQty(s.shortfallQuantity)} units short</span>
                    <Badge tone={statusTone(s.status)}>{humanizeStatus(s.status)}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Details" />
            <div className="space-y-2 px-5 py-4 text-sm">
              <Row label="Customer" value={o.customer.name} />
              <Row label="Salesperson" value={o.salesperson.name} />
              <Row label="Payment terms" value={o.paymentTerms ?? "—"} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-ink-text">{value}</span>
    </div>
  );
}
