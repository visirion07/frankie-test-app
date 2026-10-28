// Mocked REST API for the Acme Orders app. Every route here is described in
// public/frankie.openapi.json, which is what you connect in Frankie.
// /api/frankie/* is not mocked: it's real server code (server/frankie.ts).
import { delay, http, HttpResponse } from "msw";
import { findUser, SESSION_COOKIE, type DemoUser } from "../../shared/users";
import {
  commit,
  getDb,
  now,
  type Order,
  type OrderStatus,
  type Ticket,
  type TicketPriority,
  type TicketStatus,
} from "./db";
import { getScenario, logRequest } from "./scenario";

type Method = "get" | "post" | "patch" | "delete";

interface Ctx {
  request: Request;
  url: URL;
  params: Record<string, string>;
  user: DemoUser;
  body: Record<string, unknown>;
}

const ORDER_STATUSES: OrderStatus[] = ["pending", "processing", "shipped", "delivered", "cancelled"];
const TICKET_STATUSES: TicketStatus[] = ["open", "pending", "closed"];
const TICKET_PRIORITIES: TicketPriority[] = ["low", "normal", "high"];

function problem(status: number, message: string, details?: unknown) {
  return HttpResponse.json({ error: { status, message, ...(details ? { details } : {}) } }, { status });
}

/** Wraps a resolver with the scenario knobs, the session check and the request log. */
function route(method: Method, path: string, resolve: (ctx: Ctx) => Response | Promise<Response>) {
  return http[method](path, async ({ request, params, cookies }) => {
    const started = performance.now();
    const url = new URL(request.url);
    let body: Record<string, unknown> = {};
    if (method === "post" || method === "patch") {
      const text = await request.clone().text();
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = { __invalid: text };
        }
      }
    }

    const respond = async (): Promise<Response> => {
      const { latencyMs, failWith, failWritesOnly } = getScenario();
      if (latencyMs) await delay(latencyMs);
      if (failWith && (!failWritesOnly || method !== "get")) {
        return problem(failWith, `Forced ${failWith} from the mock scenario panel`);
      }
      const user = findUser(cookies[SESSION_COOKIE]);
      if (!user) return problem(401, "Not signed in");
      if ("__invalid" in body) return problem(400, "Request body is not valid JSON");
      return resolve({ request, url, params: params as Record<string, string>, user, body });
    };

    const response = await respond();
    logRequest({
      method: method.toUpperCase(),
      path: url.pathname + url.search,
      status: response.status,
      ms: Math.round(performance.now() - started),
      requestBody: method === "get" || method === "delete" ? undefined : body,
    });
    return response;
  });
}

const ownOrder = (user: DemoUser, id: string) => getDb().orders.find((o) => o.id === id && o.userId === user.id);
const ownTicket = (user: DemoUser, id: string) => getDb().tickets.find((t) => t.id === id && t.userId === user.id);
const isString = (v: unknown): v is string => typeof v === "string";

function profileFor(user: DemoUser) {
  const profile = getDb().profiles.find((p) => p.userId === user.id)!;
  return { ...user, phone: profile.phone, defaultAddress: profile.defaultAddress };
}

function restock(order: Order) {
  for (const line of order.items) {
    const product = getDb().products.find((p) => p.id === line.productId);
    if (product) product.stock += line.quantity;
  }
}

export const handlers = [
  // ---- Account ----
  route("get", "/api/me", ({ user }) => HttpResponse.json(profileFor(user))),

  route("patch", "/api/me", ({ user, body }) => {
    const profile = getDb().profiles.find((p) => p.userId === user.id)!;
    const { phone, defaultAddress } = body;
    if (phone !== undefined && !isString(phone)) return problem(422, "phone must be a string");
    if (defaultAddress !== undefined && (!isString(defaultAddress) || !defaultAddress.trim())) {
      return problem(422, "defaultAddress must be a non-empty string");
    }
    if (isString(phone)) profile.phone = phone;
    if (isString(defaultAddress)) profile.defaultAddress = defaultAddress.trim();
    commit();
    return HttpResponse.json(profileFor(user));
  }),

  // ---- Products ----
  route("get", "/api/products", ({ url }) => {
    const q = url.searchParams.get("q")?.toLowerCase();
    const category = url.searchParams.get("category");
    const inStock = url.searchParams.get("inStock");
    const products = getDb().products.filter(
      (p) =>
        (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) &&
        (!category || p.category === category) &&
        (inStock !== "true" || p.stock > 0),
    );
    return HttpResponse.json({ data: products, total: products.length });
  }),

  route("get", "/api/products/:productId", ({ params }) => {
    const product = getDb().products.find((p) => p.id === params.productId);
    return product ? HttpResponse.json(product) : problem(404, `Product ${params.productId} not found`);
  }),

  // ---- Orders ----
  route("get", "/api/orders", ({ user, url }) => {
    const status = url.searchParams.get("status");
    if (status && !ORDER_STATUSES.includes(status as OrderStatus)) {
      return problem(400, `status must be one of ${ORDER_STATUSES.join(", ")}`);
    }
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50) || 50, 100);
    const orders = getDb()
      .orders.filter((o) => o.userId === user.id && (!status || o.status === status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return HttpResponse.json({ data: orders.slice(0, limit), total: orders.length });
  }),

  route("get", "/api/orders/:orderId", ({ user, params }) => {
    const order = ownOrder(user, params.orderId);
    return order ? HttpResponse.json(order) : problem(404, `Order ${params.orderId} not found`);
  }),

  route("post", "/api/orders", ({ user, body }) => {
    const db = getDb();
    const lines = body.items;
    if (!Array.isArray(lines) || lines.length === 0) return problem(422, "items must be a non-empty array");

    const items = [];
    for (const line of lines as Array<{ productId?: unknown; quantity?: unknown }>) {
      const product = db.products.find((p) => p.id === line?.productId);
      if (!product) return problem(422, `Unknown productId ${String(line?.productId)}`);
      const quantity = Number(line.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) return problem(422, "quantity must be a positive integer");
      if (product.stock < quantity) {
        return problem(409, `Only ${product.stock} of ${product.name} in stock`, { productId: product.id, stock: product.stock });
      }
      items.push({ productId: product.id, name: product.name, quantity, unitPrice: product.price });
    }
    for (const line of items) db.products.find((p) => p.id === line.productId)!.stock -= line.quantity;

    const profile = db.profiles.find((p) => p.userId === user.id)!;
    const order: Order = {
      id: `ord_${db.nextOrder++}`,
      userId: user.id,
      status: "pending",
      items,
      total: items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
      shippingAddress: isString(body.shippingAddress) && body.shippingAddress.trim() ? body.shippingAddress.trim() : profile.defaultAddress,
      notes: isString(body.notes) ? body.notes : "",
      createdAt: now(),
      updatedAt: now(),
    };
    db.orders.push(order);
    commit();
    return HttpResponse.json(order, { status: 201 });
  }),

  route("patch", "/api/orders/:orderId", ({ user, params, body }) => {
    const order = ownOrder(user, params.orderId);
    if (!order) return problem(404, `Order ${params.orderId} not found`);
    if (order.status !== "pending" && order.status !== "processing") {
      return problem(409, `Order ${order.id} is ${order.status} and can no longer be changed`);
    }
    if (body.shippingAddress !== undefined) {
      if (!isString(body.shippingAddress) || !body.shippingAddress.trim()) return problem(422, "shippingAddress must be a non-empty string");
      order.shippingAddress = body.shippingAddress.trim();
    }
    if (body.notes !== undefined) {
      if (!isString(body.notes)) return problem(422, "notes must be a string");
      order.notes = body.notes;
    }
    order.updatedAt = now();
    commit();
    return HttpResponse.json(order);
  }),

  route("post", "/api/orders/:orderId/cancel", ({ user, params }) => {
    const order = ownOrder(user, params.orderId);
    if (!order) return problem(404, `Order ${params.orderId} not found`);
    if (order.status === "cancelled") return problem(409, `Order ${order.id} is already cancelled`);
    if (order.status === "shipped" || order.status === "delivered") {
      return problem(409, `Order ${order.id} has ${order.status === "shipped" ? "shipped" : "been delivered"}; open a support ticket for a return instead`);
    }
    order.status = "cancelled";
    order.updatedAt = now();
    restock(order);
    commit();
    return HttpResponse.json(order);
  }),

  route("delete", "/api/orders/:orderId", ({ user, params }) => {
    const db = getDb();
    const order = ownOrder(user, params.orderId);
    if (!order) return problem(404, `Order ${params.orderId} not found`);
    if (order.status !== "cancelled") return problem(409, "Only cancelled orders can be deleted. Cancel it first.");
    db.orders = db.orders.filter((o) => o.id !== order.id);
    commit();
    return new HttpResponse(null, { status: 204 });
  }),

  // ---- Support tickets ----
  route("get", "/api/tickets", ({ user, url }) => {
    const status = url.searchParams.get("status");
    const tickets = getDb()
      .tickets.filter((t) => t.userId === user.id && (!status || t.status === status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return HttpResponse.json({ data: tickets, total: tickets.length });
  }),

  route("get", "/api/tickets/:ticketId", ({ user, params }) => {
    const ticket = ownTicket(user, params.ticketId);
    return ticket ? HttpResponse.json(ticket) : problem(404, `Ticket ${params.ticketId} not found`);
  }),

  route("post", "/api/tickets", ({ user, body }) => {
    const db = getDb();
    const { subject, message, priority = "normal", orderId = null } = body;
    if (!isString(subject) || !subject.trim()) return problem(422, "subject is required");
    if (!isString(message) || !message.trim()) return problem(422, "message is required");
    if (!TICKET_PRIORITIES.includes(priority as TicketPriority)) return problem(422, `priority must be one of ${TICKET_PRIORITIES.join(", ")}`);
    if (orderId !== null && (!isString(orderId) || !ownOrder(user, orderId))) return problem(422, `Unknown orderId ${String(orderId)}`);
    const ticket: Ticket = {
      id: `tkt_${db.nextTicket++}`,
      userId: user.id,
      subject: subject.trim(),
      message: message.trim(),
      status: "open",
      priority: priority as TicketPriority,
      orderId: orderId as string | null,
      createdAt: now(),
      updatedAt: now(),
    };
    db.tickets.push(ticket);
    commit();
    return HttpResponse.json(ticket, { status: 201 });
  }),

  route("patch", "/api/tickets/:ticketId", ({ user, params, body }) => {
    const ticket = ownTicket(user, params.ticketId);
    if (!ticket) return problem(404, `Ticket ${params.ticketId} not found`);
    if (body.status !== undefined) {
      if (!TICKET_STATUSES.includes(body.status as TicketStatus)) return problem(422, `status must be one of ${TICKET_STATUSES.join(", ")}`);
      ticket.status = body.status as TicketStatus;
    }
    if (body.priority !== undefined) {
      if (!TICKET_PRIORITIES.includes(body.priority as TicketPriority)) return problem(422, `priority must be one of ${TICKET_PRIORITIES.join(", ")}`);
      ticket.priority = body.priority as TicketPriority;
    }
    ticket.updatedAt = now();
    commit();
    return HttpResponse.json(ticket);
  }),

  // ---- Reports ----
  route("get", "/api/reports/summary", ({ user }) => {
    const orders = getDb().orders.filter((o) => o.userId === user.id);
    const byStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, orders.filter((o) => o.status === s).length]));
    const spend = orders.filter((o) => o.status !== "cancelled");
    const byMonth: Record<string, number> = {};
    for (const o of spend) byMonth[o.createdAt.slice(0, 7)] = (byMonth[o.createdAt.slice(0, 7)] ?? 0) + o.total;
    return HttpResponse.json({
      orderCount: orders.length,
      ordersByStatus: byStatus,
      totalSpend: spend.reduce((sum, o) => sum + o.total, 0),
      spendByMonth: Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, total]) => ({ month, total })),
      openTickets: getDb().tickets.filter((t) => t.userId === user.id && t.status !== "closed").length,
    });
  }),
];
