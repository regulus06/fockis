import { useEffect, useState } from "react";
import { shopAdminApi } from "../api/shopAdminApi";

export default function ShopAdminProductsPage() {
  const [data, setData] = useState<any>({ items: [] });
  const [error, setError] = useState("");
  const load = () => shopAdminApi.products("status=pending&limit=50").then(setData).catch(e => setError(e.message));
  useEffect(load, []);
  const action = async (id: string, name: string, actionName: string) => { const reason = actionName === "reject" ? window.prompt(`Reason for rejecting ${name}?`) || "Rejected by Shop Admin" : ""; await shopAdminApi.productAction(id, actionName, reason); load(); };
  return <section className="shop-admin-page"><div className="page-title"><div><span>PRODUCTS</span><h2>Product Approval</h2><p>Review products before they are allowed to sell on Fockis Shop.</p></div></div>{error && <div className="admin-error">{error}</div>}<div className="admin-panel"><table><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Action</th></tr></thead><tbody>{data.items?.map((p: any) => <tr key={p._id}><td>{p.name}</td><td>{p.category}</td><td>${Number(p.price || 0).toFixed(2)}</td><td>{p.stock}</td><td><button onClick={() => action(p._id, p.name, "approve")}>Approve</button><button onClick={() => action(p._id, p.name, "reject")}>Reject</button><button onClick={() => action(p._id, p.name, "flag")}>Flag</button></td></tr>)}</tbody></table></div></section>;
}
