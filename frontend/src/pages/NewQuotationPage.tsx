import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Topbar } from "../components/layout/Topbar";
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input, Textarea } from "../components/ui/Field";
import { CustomerPicker } from "../components/shared/CustomerPicker";
import { ProductPicker } from "../components/shared/ProductPicker";
import { useCreateQuotation, type QuotationItemInput } from "../api/quotations";
import { useToast } from "../components/ui/Toast";
import { getApiErrorMessage } from "../lib/apiClient";
import { documentTotal, lineTotal } from "../lib/pricing";
import { formatFullInr } from "../lib/format";

interface DraftItem extends QuotationItemInput {
  key: string;
}

function emptyItem(): DraftItem {
  return { key: crypto.randomUUID(), productId: "", quantity: 1, unitPrice: 0, discountPct: 0, taxPct: 18 };
}

export function NewQuotationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const createQuotation = useCreateQuotation();

  const [customerId, setCustomerId] = useState(searchParams.get("customerId") ?? "");
  const leadId = searchParams.get("leadId") ?? undefined;
  const [terms, setTerms] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);
  const [error, setError] = useState<string | null>(null);

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  const total = documentTotal(items.filter((i) => i.productId));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!customerId) {
      setError("Select a customer");
      return;
    }
    const validItems = items.filter((i) => i.productId && i.quantity > 0);
    if (!validItems.length) {
      setError("Add at least one item");
      return;
    }
    try {
      const quotation = await createQuotation.mutateAsync({
        customerId,
        leadId,
        terms: terms || undefined,
        validUntil: validUntil || undefined,
        items: validItems.map(({ key: _key, ...rest }) => rest),
      });
      notify(`Quotation ${quotation.quotationNumber} created`);
      navigate(`/crm/quotations/${quotation.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <>
      <Topbar title="New quotation" subtitle="Pricing, size, discount" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <CustomerPicker value={customerId} onChange={setCustomerId} />
            <Input label="Valid until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
          <div className="mt-4">
            <Textarea label="Terms" rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Line items"
            action={
              <Button type="button" variant="secondary" onClick={() => setItems((prev) => [...prev, emptyItem()])}>
                + Add item
              </Button>
            }
          />
          <div className="divide-y divide-border">
            {items.map((item) => (
              <div key={item.key} className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-12 md:items-end">
                <div className="md:col-span-4">
                  <ProductPicker value={item.productId} onChange={(productId) => updateItem(item.key, { productId })} />
                </div>
                <div className="md:col-span-2">
                  <Input
                    label="Qty"
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.key, { quantity: Number(e.target.value) })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Input
                    label="Unit price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.key, { unitPrice: Number(e.target.value) })}
                  />
                </div>
                <div className="md:col-span-1">
                  <Input
                    label="Disc %"
                    type="number"
                    min={0}
                    max={100}
                    value={item.discountPct}
                    onChange={(e) => updateItem(item.key, { discountPct: Number(e.target.value) })}
                  />
                </div>
                <div className="md:col-span-1">
                  <Input
                    label="Tax %"
                    type="number"
                    min={0}
                    max={100}
                    value={item.taxPct}
                    onChange={(e) => updateItem(item.key, { taxPct: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 md:col-span-2">
                  <span className="font-figures text-sm font-semibold text-ink-text">
                    {formatFullInr(item.productId ? lineTotal(item) : 0)}
                  </span>
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
          <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-4">
            <span className="text-sm text-muted">Grand total</span>
            <span className="font-figures text-lg font-bold text-ink-text">{formatFullInr(total)}</span>
          </div>
        </Card>

        {error && <p className="text-sm text-status-critical">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" loading={createQuotation.isPending}>
            Create quotation
          </Button>
        </div>
      </form>
    </>
  );
}
