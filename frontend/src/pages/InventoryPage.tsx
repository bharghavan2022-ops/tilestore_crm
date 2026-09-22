import { useMemo, useState, type FormEvent } from "react";
import { Topbar } from "../components/layout/Topbar";
import { Card, CardHeader } from "../components/ui/Card";
import { KpiCard } from "../components/ui/KpiCard";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Field";
import { Table, Thead, Th, Tbody, Tr, Td } from "../components/ui/Table";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { Modal } from "../components/ui/Modal";
import { ProductPicker } from "../components/shared/ProductPicker";
import { useAdjustStock, useShortages, useStock } from "../api/inventory";
import { useInventoryAlertsDashboard } from "../api/dashboard";
import { useProducts } from "../api/products";
import { useWarehouses } from "../api/warehouses";
import { statusTone, humanizeStatus } from "../lib/statusTone";
import { formatFullInr, formatQty } from "../lib/format";
import { useToast } from "../components/ui/Toast";
import { getApiErrorMessage } from "../lib/apiClient";

export function InventoryPage() {
  const [adjustOpen, setAdjustOpen] = useState(false);
  const inventoryDashboard = useInventoryAlertsDashboard();
  const shortages = useShortages({ status: "OPEN" });
  const stock = useStock();
  const products = useProducts();

  const stockValue = useMemo(() => {
    if (!stock.data || !products.data) return null;
    const costByProduct = new Map(products.data.data.map((p) => [p.id, Number(p.costPrice)]));
    return stock.data.reduce((sum, item) => sum + Number(item.quantityOnHand) * (costByProduct.get(item.productId) ?? 0), 0);
  }, [stock.data, products.data]);

  return (
    <>
      <Topbar title="Inventory & Stock Alerts" subtitle="Live view · All warehouses & stores" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total SKUs" value={products.data ? products.data.meta.total : <Spinner />} />
        <KpiCard
          label="Below reorder point"
          value={inventoryDashboard.data ? inventoryDashboard.data.belowReorderPoint.length : <Spinner />}
          hintTone="critical"
          hint={inventoryDashboard.data && inventoryDashboard.data.belowReorderPoint.length > 0 ? "Needs reorder" : undefined}
        />
        <KpiCard label="Stock value" value={stockValue !== null ? formatFullInr(stockValue) : <Spinner />} hint="At cost" />
        <KpiCard
          label="Open shortages"
          value={inventoryDashboard.data ? inventoryDashboard.data.openShortagesCount : <Spinner />}
          hintTone="warning"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-ink-text">Live stock alerts</h3>
              <p className="mt-0.5 text-xs text-muted">Requested quantity checked against Warehouse + Store + Inbound</p>
            </div>
            <Button variant="secondary" onClick={() => setAdjustOpen(true)}>
              Adjust stock
            </Button>
          </div>

          {shortages.isLoading ? (
            <div className="p-10 text-center"><Spinner className="mx-auto h-6 w-6" /></div>
          ) : shortages.data?.length ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Requested</Th>
                  <Th>Available</Th>
                  <Th>Shortfall</Th>
                  <Th>Status</Th>
                </tr>
              </Thead>
              <Tbody>
                {shortages.data.map((s) => (
                  <Tr key={s.id}>
                    <Td className="font-figures">{s.order?.orderNumber ?? s.orderId}</Td>
                    <Td className="font-figures">{formatQty(s.requestedQuantity)}</Td>
                    <Td className="font-figures">{formatQty(s.availableQuantity)}</Td>
                    <Td className="font-figures text-status-critical">{formatQty(s.shortfallQuantity)}</Td>
                    <Td>
                      <Badge tone={statusTone(s.status)}>{humanizeStatus(s.status)}</Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <EmptyState title="No active shortages" subtitle="All orders are fully covered by stock" />
          )}
        </Card>

        <Card>
          <CardHeader title="Reorder queue" subtitle="Products below reorder point" />
          {inventoryDashboard.data?.belowReorderPoint.length ? (
            <ul className="divide-y divide-border">
              {inventoryDashboard.data.belowReorderPoint.map((p) => (
                <li key={p.id} className="px-5 py-3.5">
                  <p className="text-sm font-medium text-ink-text">{p.name}</p>
                  <p className="font-figures text-xs text-status-critical">
                    {formatQty(p.available)} available · reorder at {formatQty(p.reorderPoint)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="All products above reorder point" />
          )}
        </Card>
      </div>

      <AdjustStockModal open={adjustOpen} onClose={() => setAdjustOpen(false)} />
    </>
  );
}

function AdjustStockModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { notify } = useToast();
  const warehouses = useWarehouses();
  const adjustStock = useAdjustStock();
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [quantityDelta, setQuantityDelta] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await adjustStock.mutateAsync({ productId, warehouseId, quantityDelta, note: note || undefined });
      notify("Stock adjusted");
      onClose();
      setProductId("");
      setWarehouseId("");
      setQuantityDelta(0);
      setNote("");
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Adjust stock">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <ProductPicker label="Product" value={productId} onChange={setProductId} />
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Warehouse</span>
          <select
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-brass focus:outline-none focus:ring-2 focus:ring-brass/20"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            required
          >
            <option value="">Select a location…</option>
            {warehouses.data?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.type})
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Quantity change (use negative to reduce)"
          type="number"
          step="0.01"
          value={quantityDelta}
          onChange={(e) => setQuantityDelta(Number(e.target.value))}
          required
        />
        <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Stock take, damage, etc." />
        {error && <p className="text-sm text-status-critical">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={adjustStock.isPending} disabled={!productId || !warehouseId || quantityDelta === 0}>
            Adjust
          </Button>
        </div>
      </form>
    </Modal>
  );
}
