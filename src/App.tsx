import { FrankieAgents } from "@frankieai/react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { docsKey, getUserToken, productKey, supportKey } from "./frankie";
import { MockPanel } from "./MockPanel";
import { ChatPage } from "./pages/Chat";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { OrderDetail } from "./pages/OrderDetail";
import { Orders } from "./pages/Orders";
import { Products } from "./pages/Products";
import { Tickets } from "./pages/Tickets";
import { signOut, useCurrentUser } from "./session";

export function App() {
  const user = useCurrentUser();
  const { pathname } = useLocation();

  return (
    <>
      {user ? (
        <div className="shell">
          <header className="topbar">
            <span className="brand">☕ Acme Orders</span>
            <nav>
              <NavLink to="/" end>Dashboard</NavLink>
              <NavLink to="/orders">Orders</NavLink>
              <NavLink to="/products">Products</NavLink>
              <NavLink to="/tickets">Support</NavLink>
              <NavLink to="/chat">Assistant</NavLink>
            </nav>
            <span className="who">
              {user.name} · <button className="link" onClick={signOut}>Sign out</button>
            </span>
          </header>
          {!productKey && (
            <p className="banner">
              No <code>VITE_FRANKIE_KEY</code> set, so the Frankie widget is off. Add it to <code>.env.local</code> and restart <code>npm run dev</code>.
            </p>
          )}
          <main className={pathname === "/chat" ? "main main-full" : "main"}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/:orderId" element={<OrderDetail />} />
              <Route path="/products" element={<Products />} />
              <Route path="/tickets" element={<Tickets />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      ) : (
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      )}

      {/* Mounted once at the root. The Product agent only shows to signed-in users. */}
      <FrankieAgents
        productKey={productKey}
        supportKey={supportKey}
        docsKey={docsKey}
        getUserToken={getUserToken}
        pathname={pathname}
      />
      <MockPanel />
    </>
  );
}
