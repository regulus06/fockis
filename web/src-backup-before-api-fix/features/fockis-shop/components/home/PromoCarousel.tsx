import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface PromoSlide {
eyebrow: string;
title: string;
body: string;
href: string;
cta: string;
}

const PROMO_SLIDES: PromoSlide[] = [
{
eyebrow: 'FOCKIS SHOP',
title: 'Shop local and global.',
body: 'Discover products from businesses in your community and from sellers around the world.',
href: '/shop/products',
cta: 'Shop products',
},
{
eyebrow: 'SELL ON FOCKIS',
title: 'Turn your business into a marketplace.',
body: 'Create a Fockis Store, add your products, and connect with customers beyond your local community.',
href: '/shop/sell',
cta: 'Start selling',
},
{
eyebrow: 'GLOBAL COMMERCE',
title: 'Discover businesses around the world.',
body: 'Explore stores by country and find products from businesses offering local and international delivery.',
href: '/shop/countries',
cta: 'Explore stores',
},
];

export function PromoCarousel() {
const [slide, setSlide] = useState(0);

useEffect(() => {
if (PROMO_SLIDES.length <= 1) {
return undefined;
}

const id = window.setInterval(() => {
  setSlide((current) => (current + 1) % PROMO_SLIDES.length);
}, 5000);

return () => {
  window.clearInterval(id);
};

}, []);

const activeSlide = PROMO_SLIDES[slide];

return ( <section className="tight"> <div className="wrap"> <div className="banner-carousel">
{PROMO_SLIDES.map((item, index) => (
<div
key={item.title}
className={`banner-slide${index === slide ? ' active' : ''}`}
> <div className="content"> <div className="eyebrow-sm">
{item.eyebrow} </div>

```
            <h3>{item.title}</h3>

            <p>{item.body}</p>

            <Link
              to={item.href}
              className="btn btn-brass"
              style={{ marginTop: 14 }}
            >
              {item.cta} →
            </Link>
          </div>
        </div>
      ))}

      <div className="banner-dots">
        {PROMO_SLIDES.map((item, index) => (
          <button
            key={item.title}
            type="button"
            className={`banner-dot${index === slide ? ' active' : ''}`}
            aria-label={`Show slide ${index + 1}`}
            aria-current={index === slide ? 'true' : undefined}
            onClick={() => setSlide(index)}
          />
        ))}
      </div>
    </div>

    <span
      aria-live="polite"
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {activeSlide.title}
    </span>
  </div>
</section>

);
}
