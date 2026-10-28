import { Link } from "react-router-dom";
import { money, useApi } from "../api";
import type { Order } from "../mocks/db";
import { OrdersTable } from "./Orders";
import { Status } from "../ui";

interface Summary {
  orderCount: number;
  ordersByStatus: Record<string, number>;
  totalSpend: number;
  openTickets: number;
}

export function Dashboard() {
  const summary = useApi<Summary>("/api/reports/summary");
  const recent = useApi<{ data: Order[] }>("/api/orders?limit=5");

  return (
    <>
      <h1>Dashboard</h1>
      <Status {...summary} />
      {summary.data && (
        <div className="tiles">
          <div className="tile"><span>Orders</span><strong>{summary.data.orderCount}</strong></div>
          <div className="tile"><span>Pending</span><strong>{summary.data.ordersByStatus.pending}</strong></div>
          <div className="tile"><span>Total spend</span><strong>{money(summary.data.totalSpend)}</strong></div>
          <div className="tile"><span>Open tickets</span><strong>{summary.data.openTickets}</strong></div>
        </div>
      )}
      <h2>Recent orders <Link to="/orders" className="small">See all</Link></h2>
      <Status {...recent} />
      {recent.data && <OrdersTable orders={recent.data.data} />}
      <h2>Try asking the assistant</h2>
      <ul className="prompts">
        <li>“What’s the status of my latest order?”</li>
        <li>“Order 2 bags of decaf and a brew scale to my default address.”</li>
        <li>“Change the shipping address on ord_1003 to 1 Test St, Perth.”</li>
        <li>“Cancel my pending order, then delete it.”</li>
        <li>“Order 5 Ethiopia Yirgacheffe.” (only 3 in stock → 409)</li>
        <li>“Open a support ticket about the scratched grinder.”</li>
        <li>“Show my spend by month as a table.”</li>
      </ul>
    </>
  );
}
