// The mock backend's data. Lives in localStorage so it survives reloads, and
// fires DB_CHANGED on every write so pages refetch when Frankie changes data.
import { DEMO_USERS } from "../../shared/users";

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";
export type TicketStatus = "open" | "pending" | "closed";
export type TicketPriority = "low" | "normal" | "high";

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: "coffee" | "equipment" | "merch";
  price: number;
  stock: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  shippingAddress: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  userId: string;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: TicketPriority;
  orderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  userId: string;
  phone: string;
  defaultAddress: string;
}

interface Db {
  products: Product[];
  orders: Order[];
  tickets: Ticket[];
  profiles: Profile[];
  nextOrder: number;
  nextTicket: number;
}

export const DB_CHANGED = "acme:db-changed";
const STORAGE_KEY = "acme.mockdb.v1";

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

const PRODUCTS: Product[] = [
  { id: "prd_espresso", sku: "COF-ESP-1KG", name: "House Espresso Beans 1kg", category: "coffee", price: 32, stock: 120 },
  { id: "prd_decaf", sku: "COF-DEC-1KG", name: "Swiss Water Decaf 1kg", category: "coffee", price: 36, stock: 40 },
  { id: "prd_ethiopia", sku: "COF-ETH-250", name: "Ethiopia Yirgacheffe 250g", category: "coffee", price: 18, stock: 3 },
  { id: "prd_grinder", sku: "EQP-GRN-01", name: "Burr Grinder Pro", category: "equipment", price: 249, stock: 12 },
  { id: "prd_kettle", sku: "EQP-KTL-01", name: "Gooseneck Kettle", category: "equipment", price: 89, stock: 0 },
  { id: "prd_scale", sku: "EQP-SCL-01", name: "Brew Scale", category: "equipment", price: 45, stock: 25 },
  { id: "prd_mug", sku: "MER-MUG-01", name: "Ceramic Mug", category: "merch", price: 14, stock: 200 },
  { id: "prd_tote", sku: "MER-TOT-01", name: "Canvas Tote", category: "merch", price: 12, stock: 80 },
];

function item(productId: string, quantity: number): OrderItem {
  const product = PRODUCTS.find((p) => p.id === productId)!;
  return { productId, name: product.name, quantity, unitPrice: product.price };
}

function order(
  n: number,
  userId: string,
  status: OrderStatus,
  age: number,
  items: OrderItem[],
  shippingAddress: string,
  notes = "",
): Order {
  return {
    id: `ord_${n}`,
    userId,
    status,
    items,
    total: items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
    shippingAddress,
    notes,
    createdAt: daysAgo(age),
    updatedAt: daysAgo(Math.max(0, age - 1)),
  };
}

function seed(): Db {
  const [jorge, priya, sam] = DEMO_USERS.map((u) => u.id);
  const jorgeAddr = "12 Harbour St, Sydney NSW 2000";
  const priyaAddr = "88 King St, Melbourne VIC 3000";
  const samAddr = "4 Elm Rd, Brisbane QLD 4000";
  return {
    products: PRODUCTS.map((p) => ({ ...p })),
    orders: [
      order(1001, jorge, "delivered", 40, [item("prd_espresso", 4), item("prd_mug", 6)], jorgeAddr),
      order(1002, jorge, "shipped", 6, [item("prd_grinder", 1)], jorgeAddr, "Leave at the back door"),
      order(1003, jorge, "processing", 2, [item("prd_decaf", 2), item("prd_scale", 1)], jorgeAddr),
      order(1004, jorge, "pending", 0, [item("prd_ethiopia", 2)], jorgeAddr),
      order(1005, jorge, "cancelled", 15, [item("prd_tote", 3)], jorgeAddr),
      order(1006, priya, "delivered", 25, [item("prd_grinder", 2), item("prd_scale", 2)], priyaAddr),
      order(1007, priya, "pending", 1, [item("prd_espresso", 10)], priyaAddr, "Office restock"),
      order(1008, sam, "delivered", 60, [item("prd_mug", 1)], samAddr),
    ],
    tickets: [
      {
        id: "tkt_501",
        userId: jorge,
        subject: "Grinder arrived with a scratch",
        message: "The grinder from ord_1002 has a scratch on the hopper.",
        status: "open",
        priority: "normal",
        orderId: "ord_1002",
        createdAt: daysAgo(1),
        updatedAt: daysAgo(1),
      },
      {
        id: "tkt_502",
        userId: priya,
        subject: "Invoice for March",
        message: "Can I get a tax invoice for ord_1006?",
        status: "closed",
        priority: "low",
        orderId: "ord_1006",
        createdAt: daysAgo(20),
        updatedAt: daysAgo(18),
      },
    ],
    profiles: [
      { userId: jorge, phone: "+61 400 000 001", defaultAddress: jorgeAddr },
      { userId: priya, phone: "+61 400 000 002", defaultAddress: priyaAddr },
      { userId: sam, phone: "", defaultAddress: samAddr },
    ],
    nextOrder: 1009,
    nextTicket: 503,
  };
}

function load(): Db {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Db;
  } catch {
    // Unreadable storage: start from the seed.
  }
  return seed();
}

let db = load();

export function getDb(): Db {
  return db;
}

/** Persist and tell the UI. Call after every mutation. */
export function commit(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Storage blocked: keep the in-memory copy.
  }
  window.dispatchEvent(new Event(DB_CHANGED));
}

export function resetDb(): void {
  db = seed();
  commit();
}

export const now = () => new Date().toISOString();
