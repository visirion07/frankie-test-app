import { useNavigate } from "react-router-dom";
import { DEMO_USERS } from "../../shared/users";
import { signIn } from "../session";

export function Login() {
  const navigate = useNavigate();
  return (
    <div className="login">
      <h1>☕ Acme Orders</h1>
      <p className="muted">A mock app for testing Frankie. Pick a demo account; each one has its own orders and tickets.</p>
      <div className="user-list">
        {DEMO_USERS.map((user) => (
          <button
            key={user.id}
            className="user-card"
            onClick={() => {
              signIn(user.id);
              navigate("/");
            }}
          >
            <strong>{user.name}</strong>
            <span>{user.email}</span>
            <span className="muted">
              {user.company} · {user.plan} plan · <code>{user.id}</code>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
