import { useState } from "react";
import { useParams } from "react-router-dom";
import { Topbar } from "../components/layout/Topbar";
import { Card, CardHeader } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input, Textarea } from "../components/ui/Field";
import { FullScreenSpinner } from "../components/ui/Spinner";
import { EmptyState } from "../components/ui/EmptyState";
import { useDelayDelivery, useDelivery, useDispatchDelivery, useMarkDelivered, useUploadPod } from "../api/logistics";
import { statusTone, humanizeStatus } from "../lib/statusTone";
import { formatDateTime } from "../lib/format";
import { useToast } from "../components/ui/Toast";
import { getApiErrorMessage } from "../lib/apiClient";

export function DeliveryDetailPage() {
  const { deliveryId } = useParams<{ deliveryId: string }>();
  const { notify } = useToast();
  const delivery = useDelivery(deliveryId);
  const dispatch = useDispatchDelivery(deliveryId!);
  const delay = useDelayDelivery(deliveryId!);
  const markDelivered = useMarkDelivered(deliveryId!);
  const uploadPod = useUploadPod(deliveryId!);

  const [delayReason, setDelayReason] = useState("");
  const [podUrl, setPodUrl] = useState("");

  if (delivery.isLoading) return <FullScreenSpinner />;
  if (!delivery.data) return <EmptyState title="Delivery not found" />;

  const d = delivery.data;

  async function run<T>(action: () => Promise<T>, successMsg: string) {
    try {
      await action();
      notify(successMsg);
    } catch (err) {
      notify(getApiErrorMessage(err), "error");
    }
  }

  return (
    <>
      <Topbar title={d.order.orderNumber} subtitle={d.destinationAddress} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge tone={statusTone(d.status)}>{humanizeStatus(d.status)}</Badge>
        {d.status === "PENDING_DISPATCH" && (
          <Button loading={dispatch.isPending} onClick={() => run(() => dispatch.mutateAsync(), "Dispatched")}>
            Dispatch
          </Button>
        )}
        {(d.status === "IN_TRANSIT" || d.status === "DELAYED") && (
          <Button
            variant="secondary"
            loading={markDelivered.isPending}
            onClick={() => run(() => markDelivered.mutateAsync(), "Marked delivered")}
          >
            Mark delivered
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {d.status !== "DELIVERED" && d.status !== "POD_UPLOADED" && (
            <Card>
              <CardHeader title="Report a delay" />
              <div className="flex flex-wrap items-end gap-3 px-5 py-4">
                <div className="flex-1">
                  <Textarea label="Reason" rows={1} value={delayReason} onChange={(e) => setDelayReason(e.target.value)} />
                </div>
                <Button
                  variant="secondary"
                  loading={delay.isPending}
                  disabled={!delayReason}
                  onClick={() =>
                    run(() => delay.mutateAsync({ reason: delayReason }), "Delay recorded").then(() => setDelayReason(""))
                  }
                >
                  Record delay
                </Button>
              </div>
              {d.delayEvents.length > 0 && (
                <ul className="divide-y divide-border border-t border-border">
                  {d.delayEvents.map((e) => (
                    <li key={e.id} className="px-5 py-3 text-sm">
                      <p className="text-ink-text">{e.reason}</p>
                      <p className="font-figures text-xs text-muted">{formatDateTime(e.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          <Card>
            <CardHeader title="Proof of delivery" />
            {d.pod?.status === "UPLOADED" || d.pod?.status === "VERIFIED" ? (
              <div className="px-5 py-4 text-sm">
                <Badge tone="success">Uploaded</Badge>
                <a
                  href={d.pod.fileUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block text-brass-dark hover:underline"
                >
                  View file
                </a>
              </div>
            ) : d.status === "DELIVERED" ? (
              <div className="flex flex-wrap items-end gap-3 px-5 py-4">
                <div className="flex-1">
                  <Input
                    label="File / Drive link"
                    placeholder="https://drive.google.com/…"
                    value={podUrl}
                    onChange={(e) => setPodUrl(e.target.value)}
                  />
                </div>
                <Button
                  loading={uploadPod.isPending}
                  disabled={!podUrl}
                  onClick={() => run(() => uploadPod.mutateAsync({ fileUrl: podUrl }), "POD uploaded").then(() => setPodUrl(""))}
                >
                  Upload
                </Button>
              </div>
            ) : (
              <EmptyState title="Not applicable yet" subtitle="POD can be uploaded once the delivery is marked delivered" />
            )}
          </Card>
        </div>

        <Card>
          <CardHeader title="Delivery details" />
          <div className="space-y-2 px-5 py-4 text-sm">
            <Row label="Vehicle" value={d.vehicle?.registrationNumber ?? "—"} />
            <Row label="Driver" value={d.driverName ?? "—"} />
            <Row label="ETA" value={d.eta ? formatDateTime(d.eta) : "—"} />
            <Row label="Dispatched" value={d.dispatchedAt ? formatDateTime(d.dispatchedAt) : "—"} />
            <Row label="Delivered" value={d.deliveredAt ? formatDateTime(d.deliveredAt) : "—"} />
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
