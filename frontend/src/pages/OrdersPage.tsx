import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Topbar } from "../components/layout/Topbar";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Select } from "../components/ui/Field";
import { Table, Thead, Th, Tbody, Tr, Td } from "../components/ui/Table";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { useOrders } from "../api/orders";
import { statusTone, humanizeStatus } from "../lib/statusTone";
import { formatFullInr, formatDate } from "../lib/format";
import type { OrderStatus } from "../types/api";

const ORDER_STATUSES: OrderStatus[] = [
  "CONFIRMED",
  "PARTIALLY_RESERVED",
  "RESERVED",
  "AWAITING_PURCHASE",
  "PICKING",
  "PACKED",
  "READY_FOR_DISPATCH",
  "DISPATCHED",
  "DELIVERED",
  "CLOSED",
  "CANCELLED",
];

export function OrdersPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<OrderStatus | "">("");
  const orders = useOrders(status ? { status } : {});

  return (
    <>
      <Topbar title="Orders" subtitle="Confirmed quotations moving through fulfilment" />

      <Card>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold text-ink-text">Order tracker</h3>
          <div className="w-56">
            <Select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
              <option value="">All statuses</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {humanizeStatus(s)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {orders.isLoading ? (
          <div className="p-10 text-center"><Spinner className="mx-auto h-6 w-6" /></div>
        ) : orders.data?.data.length ? (
          <Table>
            <Thead>
              <tr>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>Salesperson</Th>
                <Th>Status</Th>
                <Th>Value</Th>
                <Th>Created</Th>
              </tr>
            </Thead>
            <Tbody>
              {orders.data.data.map((order) => (
                <Tr key={order.id} onClick={() => navigate(`/orders/${order.id}`)}>
                  <Td className="font-figures font-medium">{order.orderNumber}</Td>
                  <Td>{order.customer.name}</Td>
                  <Td>{order.salesperson.name}</Td>
                  <Td>
                    <Badge tone={statusTone(order.status)}>{humanizeStatus(order.status)}</Badge>
                  </Td>
                  <Td className="font-figures">{formatFullInr(order.grandTotal)}</Td>
                  <Td className="font-figures text-xs text-muted">{formatDate(order.createdAt)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        ) : (
          <EmptyState title="No orders yet" subtitle="Orders appear here once a quotation is approved and converted" />
        )}
        {orders.data && (
          <p className="border-t border-border px-5 py-3 text-xs text-muted">
            Showing {orders.data.data.length} of {orders.data.meta.total} orders
          </p>
        )}
      </Card>
    </>
  );
}
