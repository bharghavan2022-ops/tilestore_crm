import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Topbar } from "../components/layout/Topbar";
import { Card, CardHeader } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Select, Textarea } from "../components/ui/Field";
import { FullScreenSpinner } from "../components/ui/Spinner";
import { EmptyState } from "../components/ui/EmptyState";
import { EmployeePicker } from "../components/shared/EmployeePicker";
import { useAddActivity, useAssignLead, useLead, useUpdateLeadStatus } from "../api/leads";
import { useQuotations } from "../api/quotations";
import { statusTone, humanizeStatus } from "../lib/statusTone";
import { formatDateTime } from "../lib/format";
import { useToast } from "../components/ui/Toast";
import { getApiErrorMessage } from "../lib/apiClient";
import { ACTIVITY_TYPES, activityTypeConfig } from "../lib/activityTypes";
import type { LeadStatus } from "../types/api";

const LEAD_STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "SITE_VISIT_SCHEDULED", "SURVEY_DONE", "QUOTED", "WON", "LOST"];

export function LeadDetailPage() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();
  const lead = useLead(leadId);
  const quotations = useQuotations({ customerId: lead.data?.customerId });
  const assignLead = useAssignLead(leadId!);
  const updateStatus = useUpdateLeadStatus(leadId!);
  const addActivity = useAddActivity(leadId!);

  const [assignee, setAssignee] = useState("");
  const [nextStatus, setNextStatus] = useState<LeadStatus | "">("");
  const [lostReason, setLostReason] = useState("");
  const [activityType, setActivityType] = useState("CALL");
  const [activityNotes, setActivityNotes] = useState("");

  const leadQuotations = useMemo(
    () => quotations.data?.data.filter((q) => q.leadId === leadId) ?? [],
    [quotations.data, leadId],
  );

  if (lead.isLoading) return <FullScreenSpinner />;
  if (!lead.data) return <EmptyState title="Lead not found" />;

  async function handleAssign(e: FormEvent) {
    e.preventDefault();
    if (!assignee) return;
    try {
      await assignLead.mutateAsync(assignee);
      notify("Lead reassigned");
      setAssignee("");
    } catch (err) {
      notify(getApiErrorMessage(err), "error");
    }
  }

  async function handleStatusChange(e: FormEvent) {
    e.preventDefault();
    if (!nextStatus) return;
    try {
      await updateStatus.mutateAsync({ status: nextStatus, lostReason: nextStatus === "LOST" ? lostReason : undefined });
      notify("Status updated");
      setNextStatus("");
      setLostReason("");
    } catch (err) {
      notify(getApiErrorMessage(err), "error");
    }
  }

  async function handleAddActivity(e: FormEvent) {
    e.preventDefault();
    try {
      await addActivity.mutateAsync({ type: activityType, notes: activityNotes || undefined });
      notify("Activity logged");
      setActivityNotes("");
    } catch (err) {
      notify(getApiErrorMessage(err), "error");
    }
  }

  return (
    <>
      <Topbar title={lead.data.customer.name} subtitle={`Lead · ${lead.data.source ?? "Unknown source"}`} />

      <div className="mb-4 flex items-center gap-2">
        <Badge tone={statusTone(lead.data.status)}>{humanizeStatus(lead.data.status)}</Badge>
        <span className="text-xs text-muted">Assigned to {lead.data.assignedTo?.name ?? "nobody yet"}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Activities" subtitle="Calls, visits, follow-ups logged against this lead" />
            {lead.data.activities.length ? (
              <ul className="divide-y divide-border">
                {lead.data.activities.map((a) => {
                  const config = activityTypeConfig(a.type);
                  const ActivityIcon = config.icon;
                  return (
                    <li key={a.id} className="flex items-start gap-3 px-5 py-3.5">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${config.badgeClassName}`}>
                        <ActivityIcon size={16} strokeWidth={2} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-ink-text">{config.label}</span>
                          <span className="font-figures text-xs text-muted">{formatDateTime(a.createdAt)}</span>
                        </div>
                        {a.notes && <p className="mt-0.5 text-sm text-muted">{a.notes}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState title="No activities logged yet" />
            )}
            <form className="border-t border-border p-5" onSubmit={handleAddActivity}>
              <span className="mb-2 block text-xs font-medium text-muted">Log activity</span>
              <div className="flex flex-wrap gap-2">
                {ACTIVITY_TYPES.map((t) => {
                  const TypeIcon = t.icon;
                  const selected = activityType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setActivityType(t.value)}
                      title={t.label}
                      className={`flex h-10 w-10 items-center justify-center rounded-lg text-white transition-all ${t.badgeClassName} ${
                        selected ? "ring-2 ring-ink ring-offset-2" : "opacity-50 hover:opacity-80"
                      }`}
                    >
                      <TypeIcon size={17} strokeWidth={2} />
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div className="flex-1">
                  <Textarea
                    label="Notes"
                    rows={1}
                    value={activityNotes}
                    onChange={(e) => setActivityNotes(e.target.value)}
                    placeholder="What happened?"
                  />
                </div>
                <Button type="submit" loading={addActivity.isPending}>
                  Log activity
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader
              title="Quotations"
              subtitle="Quotes raised for this lead"
              action={
                <Link to={`/crm/quotations/new?leadId=${leadId}&customerId=${lead.data.customerId}`}>
                  <Button variant="secondary">New quotation</Button>
                </Link>
              }
            />
            {leadQuotations.length ? (
              <ul className="divide-y divide-border">
                {leadQuotations.map((q) => (
                  <li key={q.id}>
                    <Link
                      to={`/crm/quotations/${q.id}`}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-cream/60"
                    >
                      <div>
                        <p className="font-figures text-sm font-medium text-ink-text">{q.quotationNumber}</p>
                        <p className="font-figures text-xs text-muted">₹{q.grandTotal}</p>
                      </div>
                      <Badge tone={statusTone(q.status)}>{humanizeStatus(q.status)}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No quotations yet" subtitle="Create one once the customer is ready for pricing" />
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Customer" />
            <div className="space-y-2 px-5 py-4 text-sm">
              <InfoRow label="Phone" value={lead.data.customer.phone ?? "—"} />
              <InfoRow label="Email" value={lead.data.customer.email ?? "—"} />
              <InfoRow label="Segment" value={humanizeStatus(lead.data.customer.segment)} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Reassign" />
            <form className="space-y-3 px-5 py-4" onSubmit={handleAssign}>
              <EmployeePicker value={assignee} onChange={setAssignee} allowUnassigned={false} />
              <Button type="submit" className="w-full" loading={assignLead.isPending} disabled={!assignee}>
                Assign
              </Button>
            </form>
          </Card>

          <Card>
            <CardHeader title="Update status" />
            <form className="space-y-3 px-5 py-4" onSubmit={handleStatusChange}>
              <Select label="New status" value={nextStatus} onChange={(e) => setNextStatus(e.target.value as LeadStatus)}>
                <option value="">Select…</option>
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {humanizeStatus(s)}
                  </option>
                ))}
              </Select>
              {nextStatus === "LOST" && (
                <Textarea
                  label="Lost reason"
                  required
                  rows={2}
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                />
              )}
              <Button type="submit" className="w-full" loading={updateStatus.isPending} disabled={!nextStatus}>
                Update
              </Button>
            </form>
          </Card>
        </div>
      </div>

      <button onClick={() => navigate(-1)} className="mt-6 text-xs text-muted hover:text-ink-text">
        ← Back
      </button>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-ink-text">{value}</span>
    </div>
  );
}
