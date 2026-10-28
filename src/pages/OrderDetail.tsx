import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch, ApiError, date, money, useApi } from "../api";
import type { Order } from "../mocks/db";
import { Badge, Status } from "../ui";

export function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const order = useApi<Order>(`/api/orders/${orderId}`);
  const [actionError, setActionError] = useState<string>();

  async function run(action: () => Promise<unknown>) {
    setActionError(undefined);
    try {
      await action();
    } catch (err) {
      setActionError((err as ApiError).message);
    }
  }

  const o = order.data;
  return (
    <>
      <p><Link to="/orders">← Orders</Link></p>
      <Status {...order} />
      {o && (
        <>
          <h1><code>{o.id}</code> <Badge value={o.status} /></h1>
          <dl className="facts">
            <dt>Placed</dt><dd>{date(o.createdAt)}</dd>
            <dt>Ship to</dt><dd>{o.shippingAddress}</dd>
            <dt>Notes</dt><dd>{o.notes || <span className="muted">none</span>}</dd>
          </dl>
          <table>
            <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Unit</th><th className="num">Line</th></tr></thead>
            <tbody>
              {o.items.map((i) => (
                <tr key={i.productId}>
                  <td>{i.name}</td>
                  <td className="num">{i.quantity}</td>
                  <td className="num">{money(i.unitPrice)}</td>
                  <td className="num">{money(i.quantity * i.unitPrice)}</td>
                </tr>
              ))}
              <tr><td colSpan={3}><strong>Total</strong></td><td className="num"><strong>{money(o.total)}</strong></td></tr>
            </tbody>
          </table>
          <div className="actions">
            <button onClick={() => run(() => apiFetch(`/api/orders/${o.id}/cancel`, { method: "POST" }))}>Cancel order</button>
            <button
              className="danger"
              onClick={() => run(async () => {
                await apiFetch(`/api/orders/${o.id}`, { method: "DELETE" });
                navigate("/orders");
              })}
            >
              Delete
            </button>
          </div>
          {actionError && <p className="error">{actionError}</p>}
        </>
      )}
    </>
  );
}
