import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Topbar } from "../components/layout/Topbar";
import { Card } from "../components/ui/Card";
import { KpiCard } from "../components/ui/KpiCard";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Table, Thead, Th, Tbody, Tr, Td } from "../components/ui/Table";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { useCrmDashboard } from "../api/dashboard";
import { useLeads } from "../api/leads";
import { humanizeStatus, statusTone } from "../lib/statusTone";
import { formatDate } from "../lib/format";
import { NewLeadModal } from "../components/crm/NewLeadModal";

export function CrmLeadsPage() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const crm = useCrmDashboard();
  const leads = useLeads();
  const lostLeads = useLeads({ status: "LOST" });

  const lostReasonBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const lead of lostLeads.data?.data ?? []) {
      const reason = lead.lostReason ?? "No reason recorded";
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [lostLeads.data]);

  const won = crm.data?.byStatus.WON ?? 0;
  const lost = crm.data?.byStatus.LOST ?? 0;
  const inProgress = (crm.data?.totalLeads ?? 0) - won - lost;

  return (
    <>
      <Topbar title="CRM & Leads" subtitle="Live view · All salespeople" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total leads"
          value={crm.data ? crm.data.totalLeads : <Spinner />}
          icon={Users}
          iconClassName="bg-gradient-to-br from-fuchsia-500 to-violet-600"
        />
        <KpiCard
          label="Converted / closed"
          value={won}
          hintTone="success"
          hint={crm.data?.winRatePct != null ? `${crm.data.winRatePct}% win rate` : undefined}
          icon={CheckCircle2}
          iconClassName="bg-gradient-to-br from-emerald-500 to-teal-600"
        />
        <KpiCard
          label="Lost / not closed"
          value={lost}
          hintTone="critical"
          icon={XCircle}
          iconClassName="bg-gradient-to-br from-red-500 to-rose-600"
        />
        <KpiCard
          label="Still in progress"
          value={inProgress}
          icon={Clock}
          iconClassName="bg-gradient-to-br from-amber-400 to-orange-500"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-ink-text">Lead tracker</h3>
              <p className="mt-0.5 text-xs text-muted">Every lead, from capture through to order</p>
            </div>
            <Button onClick={() => setModalOpen(true)}>New lead</Button>
          </div>

          {leads.isLoading ? (
            <div className="p-10 text-center"><Spinner className="mx-auto h-6 w-6" /></div>
          ) : leads.data?.data.length ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Lead / customer</Th>
                  <Th>Salesperson</Th>
                  <Th>Stage</Th>
                  <Th>Created</Th>
                </tr>
              </Thead>
              <Tbody>
                {leads.data.data.map((lead) => (
                  <Tr key={lead.id} onClick={() => navigate(`/crm/leads/${lead.id}`)}>
                    <Td>
                      <p className="font-medium">{lead.customer.name}</p>
                      {lead.source && <p className="text-xs text-muted">{lead.source}</p>}
                    </Td>
                    <Td>{lead.assignedTo?.name ?? <span className="text-muted">Unassigned</span>}</Td>
                    <Td>
                      <Badge tone={statusTone(lead.status)}>{humanizeStatus(lead.status)}</Badge>
                    </Td>
                    <Td className="font-figures text-xs text-muted">{formatDate(lead.createdAt)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <EmptyState title="No leads yet" subtitle="Create a lead to start the CRM workflow" />
          )}
          {leads.data && (
            <p className="border-t border-border px-5 py-3 text-xs text-muted">
              Showing {leads.data.data.length} of {leads.data.meta.total} leads
            </p>
          )}
        </Card>

        <Card>
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-semibold text-ink-text">Lost-reason breakdown</h3>
          </div>
          {lostReasonBreakdown.length ? (
            <ul className="divide-y divide-border">
              {lostReasonBreakdown.map(([reason, count]) => (
                <li key={reason} className="flex items-center justify-between px-5 py-3.5 text-sm">
                  <span className="text-ink-text">{reason}</span>
                  <span className="font-figures font-semibold text-status-critical">{count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No lost leads" />
          )}
        </Card>
      </div>

      <NewLeadModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
