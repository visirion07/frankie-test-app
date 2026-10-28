import { money, useApi } from "../api";
import type { Product } from "../mocks/db";
import { Status } from "../ui";

export function Products() {
  const products = useApi<{ data: Product[] }>("/api/products");
  return (
    <>
      <h1>Products</h1>
      <Status {...products} />
      {products.data && (
        <table>
          <thead><tr><th>Product</th><th>ID</th><th>SKU</th><th>Category</th><th className="num">Price</th><th className="num">Stock</th></tr></thead>
          <tbody>
            {products.data.data.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td><code>{p.id}</code></td>
                <td><code>{p.sku}</code></td>
                <td>{p.category}</td>
                <td className="num">{money(p.price)}</td>
                <td className={p.stock === 0 ? "num error" : "num"}>{p.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
