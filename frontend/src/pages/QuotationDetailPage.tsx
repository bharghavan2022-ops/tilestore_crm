import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, AlertCircle, XCircle, ArrowRightCircle } from "lucide-react";
import { Topbar } from "../components/layout/Topbar";
import { Card, CardHeader } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Textarea } from "../components/ui/Field";
import { Table, Thead, Th, Tbody, Tr, Td } from "../components/ui/Table";
import { FullScreenSpinner } from "../components/ui/Spinner";
import { EmptyState } from "../components/ui/EmptyState";
import { useAuth } from "../auth/AuthContext";
import { useCreateOrderFromQuotation } from "../api/orders";
import { useDecideQuotation, useQuotation, useSubmitQuotation } from "../api/quotations";
import { statusTone, humanizeStatus } from "../lib/statusTone";
import { formatFullInr, formatDateTime } from "../lib/format";
import { useToast } from "../components/ui/Toast";
import { getApiErrorMessage } from "../lib/apiClient";

export function QuotationDetailPage() {
  const { quotationId } = useParams<{ quotationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useToast();
  const quotation = useQuotation(quotationId);
  const submit = useSubmitQuotation(quotationId!);
  const decide = useDecideQuotation(quotationId!);
  const createOrder = useCreateOrderFromQuotation();
  const [comment, setComment] = useState("");

  if (quotation.isLoading) return <FullScreenSpinner />;
  if (!quotation.data) return <EmptyState title="Quotation not found" />;

  const q = quotation.data;
  const isManager = user?.role === "OWNER" || user?.role === "ADMIN";
  const canSubmit = q.status === "DRAFT" || q.status === "CHANGES_REQUIRED";
  const canDecide = q.status === "PENDING_APPROVAL" && isManager;
  const canConvert = q.status === "APPROVED";

  async function handleSubmit() {
    try {
      await submit.mutateAsync();
      notify("Submitted for approval");
    } catch (err) {
      notify(getApiErrorMessage(err), "error");
    }
  }

  async function handleDecision(decision: "APPROVED" | "REJECTED" | "CHANGES_REQUIRED") {
    try {
      await decide.mutateAsync({ decision, comment: comment || undefined });
      notify(`Quotation ${decision.toLowerCase().replace("_", " ")}`);
      setComment("");
    } catch (err) {
      notify(getApiErrorMessage(err), "error");
    }
  }

  async function handleConvert() {
    try {
      const order = await createOrder.mutateAsync(q.id);
      notify(`Order ${order.orderNumber} created`);
      navigate(`/orders/${order.id}`);
    } catch (err) {
      notify(getApiErrorMessage(err), "error");
    }
  }

  return (
    <>
      <Topbar title={q.quotationNumber} subtitle={q.customer.name} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge tone={statusTone(q.status)}>{humanizeStatus(q.status)}</Badge>
        {canSubmit && (
          <Button variant="secondary" loading={submit.isPending} onClick={handleSubmit}>
            Submit for approval
          </Button>
        )}
        {canConvert && (
          <Button loading={createOrder.isPending} onClick={handleConvert}>
            <ArrowRightCircle size={16} /> Convert to order
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Line items" />
          <Table>
            <Thead>
              <tr>
                <Th>Product</Th>
                <Th>Qty</Th>
                <Th>Unit price</Th>
                <Th>Disc%</Th>
                <Th>Tax%</Th>
                <Th>Line total</Th>
              </tr>
            </Thead>
            <Tbody>
              {q.items.map((item) => (
                <Tr key={item.id}>
                  <Td>
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-xs text-muted">{item.product.sku}</p>
                  </Td>
                  <Td className="font-figures">{item.quantity}</Td>
                  <Td className="font-figures">{formatFullInr(item.unitPrice)}</Td>
                  <Td className="font-figures">{item.discountPct}%</Td>
                  <Td className="font-figures">{item.taxPct}%</Td>
                  <Td className="font-figures font-semibold">{formatFullInr(item.lineTotal)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          <div className="space-y-1 border-t border-border px-5 py-4 text-right text-sm">
            <p className="text-muted">Subtotal: <span className="font-figures text-ink-text">{formatFullInr(q.subtotal)}</span></p>
            <p className="text-muted">Tax: <span className="font-figures text-ink-text">{formatFullInr(q.taxTotal)}</span></p>
            <p className="text-base font-semibold text-ink-text">
              Grand total: <span className="font-figures">{formatFullInr(q.grandTotal)}</span>
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          {canDecide && (
            <Card>
              <CardHeader title="Approval decision" />
              <div className="space-y-3 px-5 py-4">
                <Textarea label="Comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
                <div className="flex flex-col gap-2">
                  <Button loading={decide.isPending} onClick={() => handleDecision("APPROVED")}>
                    <CheckCircle2 size={16} /> Approve
                  </Button>
                  <Button variant="secondary" loading={decide.isPending} onClick={() => handleDecision("CHANGES_REQUIRED")}>
                    <AlertCircle size={16} /> Request changes
                  </Button>
                  <Button variant="danger" loading={decide.isPending} onClick={() => handleDecision("REJECTED")}>
                    <XCircle size={16} /> Reject
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Details" />
            <div className="space-y-2 px-5 py-4 text-sm">
              <Row label="Salesperson" value={q.salesperson.name} />
              <Row label="Valid until" value={q.validUntil ? formatDateTime(q.validUntil) : "—"} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Approval history" />
            {q.approvals.length ? (
              <ul className="divide-y divide-border">
                {q.approvals.map((a) => (
                  <li key={a.id} className="px-5 py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-ink-text">{a.approver.name}</span>
                      <Badge tone={statusTone(a.decision)}>{humanizeStatus(a.decision)}</Badge>
                    </div>
                    <p className="mt-1 font-figures text-xs text-muted">{formatDateTime(a.decidedAt)}</p>
                    {a.comment && <p className="mt-1 text-xs text-muted">{a.comment}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No decisions yet" />
            )}
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
