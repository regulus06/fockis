import { useSearchParams } from 'react-router-dom';
import { ShopHeader } from '../components/common/ShopHeader';
import { ShopFooter } from '../components/common/ShopFooter';
import { OrderConfirmation } from '../components/checkout/OrderConfirmation';

export default function ShopOrderConfirmationPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const orderNumber = searchParams.get('orderNumber');

  return (
    <div className="shop-page-root fk-shop">
      <ShopHeader />
      <main className="fk-container fk-page">
        <OrderConfirmation orderId={orderId} orderNumber={orderNumber} />
      </main>
      <ShopFooter />
    </div>
  );
}
