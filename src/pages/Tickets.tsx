import { useState, type FormEvent } from "react";
import { apiFetch, ApiError, date, useApi } from "../api";
import type { Ticket } from "../mocks/db";
import { Badge, Status } from "../ui";

export function Tickets() {
  const tickets = useApi<{ data: Ticket[] }>("/api/tickets");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState<string>();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    try {
      await apiFetch("/api/tickets", { method: "POST", body: { subject, message } });
      setSubject("");
      setMessage("");
    } catch (err) {
      setFormError((err as ApiError).message);
    }
  }

  return (
    <>
      <h1>Support tickets</h1>
      <Status {...tickets} />
      {tickets.data && (tickets.data.data.length ? (
        <table>
          <thead><tr><th>Ticket</th><th>Subject</th><th>Order</th><th>Priority</th><th>Status</th><th>Opened</th></tr></thead>
          <tbody>
            {tickets.data.data.map((t) => (
              <tr key={t.id}>
                <td><code>{t.id}</code></td>
                <td>{t.subject}</td>
                <td>{t.orderId ? <code>{t.orderId}</code> : "—"}</td>
                <td>{t.priority}</td>
                <td><Badge value={t.status} /></td>
                <td>{date(t.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className="empty">No tickets.</p>)}
      <h2>New ticket</h2>
      <form className="form" onSubmit={submit}>
        <input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <textarea placeholder="What’s wrong?" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
        <button type="submit">Open ticket</button>
        {formError && <p className="error">{formError}</p>}
      </form>
    </>
  );
}
