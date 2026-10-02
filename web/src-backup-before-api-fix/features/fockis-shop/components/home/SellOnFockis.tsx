import { Link } from 'react-router-dom';

const SELL_BENEFITS = [
'Create and manage your own Fockis Store',
'List products and manage your inventory',
'Reach local and international customers',
'Manage orders, shipping, and customer activity',
];

const SELL_FLOW = [
'Create your seller account',
'Set up your Fockis Store',
'Add products and inventory',
'Start accepting orders',
];

export function SellOnFockis() {
return (
<section className="tight" id="sell">
<div className="wrap">
<div className="sell-band">
<div className="sell-copy">
<div className="sec-label">
<span className="num">14</span>
SELL ON FOCKIS
</div>

        <h2>Your business belongs on Fockis.</h2>

        <p>
          Create your store and connect with customers locally
          and around the world.
        </p>

        <div className="sell-benefits">
          {SELL_BENEFITS.map((benefit) => (
            <div
              className="sell-benefit"
              key={benefit}
            >
              {benefit}
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 14,
            marginTop: 28,
            flexWrap: 'wrap',
          }}
        >
          <Link
            to="/shop/sell"
            className="btn btn-navy"
          >
            Open Your Fockis Store
          </Link>

          <Link
            to="/shop/sell"
            className="btn btn-outline"
          >
            Learn About Selling
          </Link>
        </div>
      </div>

      <div className="sell-flow">
        {SELL_FLOW.map((step, index) => (
          <div key={step}>
            <div className="flow-step">
              <span className="n">
                {index + 1}
              </span>

              <span
                className="t"
                style={
                  index === SELL_FLOW.length - 1
                    ? { color: 'var(--brass-light)' }
                    : undefined
                }
              >
                {step}
              </span>
            </div>

            {index < SELL_FLOW.length - 1 && (
              <div className="flow-connector" />
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
</section>

);
}
