import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../ui/Modal";
import { Input, Select } from "../ui/Field";
import { Button } from "../ui/Button";
import { ProductPicker } from "../shared/ProductPicker";
import { useVendors } from "../../api/vendors";
import { useCreatePurchaseOrder } from "../../api/purchaseOrders";
import { useToast } from "../ui/Toast";
import { getApiErrorMessage } from "../../lib/apiClient";

interface DraftItem {
  key: string;
  productId: string;
  quantityOrdered: number;
  unitCost: number;
}

function emptyItem(): DraftItem {
  return { key: crypto.randomUUID(), productId: "", quantityOrdered: 1, unitCost: 0 };
}

export function NewPurchaseOrderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { notify } = useToast();
  const vendors = useVendors();
  const createPo = useCreatePurchaseOrder();

  const [vendorId, setVendorId] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);
  const [error, setError] = useState<string | null>(null);

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function reset() {
    setVendorId("");
    setExpectedAt("");
    setItems([emptyItem()]);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const validItems = items.filter((i) => i.productId && i.quantityOrdered > 0);
    if (!vendorId || !validItems.length) {
      setError("Select a vendor and at least one item");
      return;
    }
    try {
      const po = await createPo.mutateAsync({
        vendorId,
        expectedAt: expectedAt || undefined,
        items: validItems.map(({ productId, quantityOrdered, unitCost }) => ({ productId, quantityOrdered, unitCost })),
      });
      notify(`Purchase order ${po.poNumber} created`);
      reset();
      onClose();
      navigate(`/purchasing/${po.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New purchase order" widthClassName="max-w-2xl">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select label="Vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)} required>
            <option value="">Select a vendor…</option>
            {vendors.data?.data.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
          <Input label="Expected date" type="date" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Items</span>
            <Button type="button" variant="secondary" onClick={() => setItems((prev) => [...prev, emptyItem()])}>
              + Add item
            </Button>
          </div>
          {items.map((item) => (
            <div key={item.key} className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 md:grid-cols-12 md:items-end">
              <div className="md:col-span-6">
                <ProductPicker value={item.productId} onChange={(productId) => updateItem(item.key, { productId })} />
              </div>
              <div className="md:col-span-3">
                <Input
                  label="Qty"
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.quantityOrdered}
                  onChange={(e) => updateItem(item.key, { quantityOrdered: Number(e.target.value) })}
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  label="Unit cost"
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.unitCost}
                  onChange={(e) => updateItem(item.key, { unitCost: Number(e.target.value) })}
                />
              </div>
              <div className="md:col-span-1">
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}
                  className="text-xs text-status-critical hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-status-critical">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createPo.isPending}>
            Create purchase order
          </Button>
        </div>
      </form>
    </Modal>
  );
}
