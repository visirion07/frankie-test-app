import { useState } from "react";
import { Link } from "react-router-dom";
import { date, money, useApi } from "../api";
import type { Order } from "../mocks/db";
import { Badge, Status } from "../ui";

const FILTERS = ["", "pending", "processing", "shipped", "delivered", "cancelled"];

export function OrdersTable({ orders }: { orders: Order[] }) {
  if (!orders.length) return <p className="empty">No orders.</p>;
  return (
    <table>
      <thead>
        <tr><th>Order</th><th>Placed</th><th>Items</th><th>Status</th><th className="num">Total</th></tr>
      </thead>
      <tbody>
        {orders.map((o) => (
          <tr key={o.id}>
            <td><Link to={`/orders/${o.id}`}><code>{o.id}</code></Link></td>
            <td>{date(o.createdAt)}</td>
            <td>{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</td>
            <td><Badge value={o.status} /></td>
            <td className="num">{money(o.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Orders() {
  const [status, setStatus] = useState("");
  const orders = useApi<{ data: Order[]; total: number }>(`/api/orders${status ? `?status=${status}` : ""}`);
  return (
    <>
      <h1>Orders</h1>
      <div className="filters">
        {FILTERS.map((f) => (
          <button key={f} className={f === status ? "chip active" : "chip"} onClick={() => setStatus(f)}>
            {f || "all"}
          </button>
        ))}
      </div>
      <Status {...orders} />
      {orders.data && <OrdersTable orders={orders.data.data} />}
    </>
  );
}
