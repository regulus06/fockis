import { Link } from 'react-router-dom';

const TRUST_ITEMS = [
{
title: 'Verified store information',
body: 'Review store profiles, locations, ratings, policies, and shipping options before you buy.',
},
{
title: 'Clear product information',
body: 'Product pages provide the available product details, pricing, and seller information needed to make an informed purchase.',
},
{
title: 'Secure checkout',
body: 'Orders are submitted through the Fockis marketplace checkout flow with supported payment and shipping information.',
},
{
title: 'Store policies',
body: 'Stores can publish their return, refund, cancellation, shipping, and customer-support policies.',
},
];

export function TrustSafety() {
return (
<section>
<div className="wrap">
<div className="section-head">
<div>
<div className="sec-label">
<span className="num">16</span>
TRUST & SAFETY
</div>

        <h2>Shop with confidence</h2>
      </div>
    </div>

    <div className="trust-grid">
      {TRUST_ITEMS.map((item) => (
        <div
          className="trust-item"
          key={item.title}
        >
          <div className="check">✓</div>

          <h5>{item.title}</h5>

          <p>{item.body}</p>
        </div>
      ))}
    </div>

    <div style={{ marginTop: 28 }}>
      <Link
        to="/shop/stores"
        className="section-link"
      >
        Explore stores →
      </Link>
    </div>
  </div>
</section>

);
}