import { useState } from "react";
import { useParams } from "react-router-dom";
import { Topbar } from "../components/layout/Topbar";
import { Card, CardHeader } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Field";
import { Table, Thead, Th, Tbody, Tr, Td } from "../components/ui/Table";
import { FullScreenSpinner } from "../components/ui/Spinner";
import { EmptyState } from "../components/ui/EmptyState";
import { usePurchaseOrder, useReceiveGoods, useUpdatePurchaseOrderStatus } from "../api/purchaseOrders";
import { useWarehouses } from "../api/warehouses";
import { statusTone, humanizeStatus } from "../lib/statusTone";
import { formatFullInr, formatQty, formatDate } from "../lib/format";
import { useToast } from "../components/ui/Toast";
import { getApiErrorMessage } from "../lib/apiClient";
import type { PurchaseOrderStatus } from "../types/api";

const ALLOWED_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"],
  PARTIALLY_RECEIVED: ["RECEIVED"],
  RECEIVED: [],
  CANCELLED: [],
};

export function PurchaseOrderDetailPage() {
  const { purchaseOrderId } = useParams<{ purchaseOrderId: string }>();
  const { notify } = useToast();
  const po = usePurchaseOrder(purchaseOrderId);
  const updateStatus = useUpdatePurchaseOrderStatus(purchaseOrderId!);
  const receiveGoods = useReceiveGoods(purchaseOrderId!);
  const warehouses = useWarehouses();

  const [receiveWarehouseId, setReceiveWarehouseId] = useState("");
  const [receiveQty, setReceiveQty] = useState<Record<string, number>>({});

  if (po.isLoading) return <FullScreenSpinner />;
  if (!po.data) return <EmptyState title="Purchase order not found" />;

  const p = po.data;
  const canReceive = ["SENT", "CONFIRMED", "PARTIALLY_RECEIVED"].includes(p.status);
  const nextStatuses = ALLOWED_TRANSITIONS[p.status];

  async function handleStatusChange(status: PurchaseOrderStatus) {
    try {
      await updateStatus.mutateAsync(status);
      notify(`Status changed to ${humanizeStatus(status)}`);
    } catch (err) {
      notify(getApiErrorMessage(err), "error");
    }
  }

  async function handleReceive() {
    if (!receiveWarehouseId) {
      notify("Select a receiving warehouse", "error");
      return;
    }
    const items = p!.items
      .filter((item) => (receiveQty[item.id] ?? 0) > 0)
      .map((item) => ({
        purchaseOrderItemId: item.id,
        warehouseId: receiveWarehouseId,
        quantityReceived: receiveQty[item.id],
      }));
    if (!items.length) {
      notify("Enter a quantity to receive", "error");
      return;
    }
    try {
      await receiveGoods.mutateAsync({ items });
      notify("Goods received");
      setReceiveQty({});
    } catch (err) {
      notify(getApiErrorMessage(err), "error");
    }
  }

  return (
    <>
      <Topbar title={p.poNumber} subtitle={p.vendor.name} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge tone={statusTone(p.status)}>{humanizeStatus(p.status)}</Badge>
        {nextStatuses.map((status) => (
          <Button
            key={status}
            variant={status === "CANCELLED" ? "danger" : "secondary"}
            loading={updateStatus.isPending}
            onClick={() => handleStatusChange(status)}
          >
            Mark {humanizeStatus(status)}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Items" />
            <Table>
              <Thead>
                <tr>
                  <Th>Product</Th>
                  <Th>Ordered</Th>
                  <Th>Received</Th>
                  <Th>Unit cost</Th>
                  {canReceive && <Th>Receive now</Th>}
                </tr>
              </Thead>
              <Tbody>
                {p.items.map((item) => {
                  const remaining = Number(item.quantityOrdered) - Number(item.quantityReceived);
                  return (
                    <Tr key={item.id}>
                      <Td>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-xs text-muted">{item.product.sku}</p>
                      </Td>
                      <Td className="font-figures">{formatQty(item.quantityOrdered)}</Td>
                      <Td className="font-figures">{formatQty(item.quantityReceived)}</Td>
                      <Td className="font-figures">{formatFullInr(item.unitCost)}</Td>
                      {canReceive && (
                        <Td>
                          {remaining > 0 ? (
                            <input
                              type="number"
                              min={0}
                              max={remaining}
                              step="0.01"
                              className="w-24 rounded-md border border-border px-2 py-1 text-sm"
                              value={receiveQty[item.id] ?? ""}
                              onChange={(e) =>
                                setReceiveQty((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))
                              }
                              placeholder={String(remaining)}
                            />
                          ) : (
                            <span className="text-xs text-status-success">Fully received</span>
                          )}
                        </Td>
                      )}
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>

            {canReceive && (
              <div className="flex flex-wrap items-end gap-3 border-t border-border p-5">
                <div className="w-56">
                  <Select label="Receiving warehouse" value={receiveWarehouseId} onChange={(e) => setReceiveWarehouseId(e.target.value)}>
                    <option value="">Select…</option>
                    {warehouses.data?.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button loading={receiveGoods.isPending} onClick={handleReceive}>
                  Record receipt
                </Button>
              </div>
            )}
          </Card>

          {p.goodsReceipts.length > 0 && (
            <Card>
              <CardHeader title="Goods receipt history" />
              <ul className="divide-y divide-border">
                {p.goodsReceipts.map((gr) => (
                  <li key={gr.id} className="px-5 py-3 text-sm">
                    <span className="font-figures text-xs text-muted">{formatDate(gr.receivedAt)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader title="Vendor" />
          <div className="space-y-2 px-5 py-4 text-sm">
            <Row label="Name" value={p.vendor.name} />
            <Row label="Phone" value={p.vendor.phone ?? "—"} />
            <Row label="Expected" value={p.expectedAt ? formatDate(p.expectedAt) : "—"} />
          </div>
        </Card>
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
