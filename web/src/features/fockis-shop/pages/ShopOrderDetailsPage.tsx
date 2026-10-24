import { useMemo } from 'react';

import { useParams } from 'react-router-dom';

import { ShopHeader } from '../components/common/ShopHeader';

import { ShopFooter } from '../components/common/ShopFooter';

import { ShopBreadcrumbs } from '../components/common/ShopBreadcrumbs';

import { ShopLoading } from '../components/common/ShopLoading';

import { ShopEmptyState } from '../components/common/ShopEmptyState';

import { useOrder } from '../hooks/useOrders';

import { formatPrice } from '../utils/currency';



type UnknownRecord = Record<string, unknown>;



function isRecord(value: unknown): value is UnknownRecord {

  return typeof value === 'object' && value !== null && !Array.isArray(value);

}



function readValue(record: UnknownRecord, keys: string[]): unknown {

  for (const key of keys) {

    const value = record[key];

    if (value !== undefined && value !== null && value !== '') return value;

  }

  return undefined;

}



function readString(value: unknown, fallback = ''): string {

  if (typeof value === 'string' && value.trim()) return value.trim();

  if (typeof value === 'number') return String(value);

  return fallback;

}



function readNumber(value: unknown, fallback = 0): number {

  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string' && value.trim()) {

    const parsed = Number(value);

    if (Number.isFinite(parsed)) return parsed;

  }

  return fallback;

}



function formatDate(value: unknown): string {

  if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) {

    return 'Date unavailable';

  }



  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Date unavailable';



  return date.toLocaleString(undefined, {

    year: 'numeric',

    month: 'short',

    day: 'numeric',

    hour: 'numeric',

    minute: '2-digit',

  });

}


function normalizeStatusKey(value: unknown): string {
  return readString(value).toLowerCase().replace(/[\s-]+/g, '_');
}

function isValidDateValue(value: unknown): boolean {
  if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) return false;
  return !Number.isNaN(new Date(value).getTime());
}

/** Find a real timestamp recorded for a status in order/shipment history. */
function findStatusTimestamp(order: UnknownRecord, statusKey: string): unknown {
  const aliases: Record<string, string[]> = {
    paid: ['paid', 'payment_succeeded', 'order_placed', 'created'],
    processing: ['processing', 'confirmed', 'order_processing'],
    ready_to_ship: ['ready_to_ship', 'ready_for_shipment', 'packed'],
    shipped: ['shipped', 'label_purchased', 'dispatched', 'shipment_created'],
    in_transit: ['in_transit', 'transit', 'accepted', 'intransit'],
    out_for_delivery: ['out_for_delivery', 'outfordelivery'],
    delivered: ['delivered', 'delivery_confirmed'],
  };
  const wanted = new Set([statusKey, ...(aliases[statusKey] ?? [])]);
  const historyKeys = ['statusHistory', 'status_history', 'statusEvents', 'status_events', 'timeline', 'trackingEvents', 'tracking_events', 'events', 'history'];
  const timestampKeys = ['timestamp', 'occurredAt', 'occurred_at', 'createdAt', 'created_at', 'updatedAt', 'updated_at', 'date', 'time', 'eventTime', 'event_time'];

  const inspect = (value: unknown): unknown => {
    if (!Array.isArray(value)) return undefined;
    for (let i = value.length - 1; i >= 0; i--) {
      const event = value[i];
      if (!isRecord(event)) continue;
      const eventStatus = normalizeStatusKey(readValue(event, ['status', 'type', 'event', 'eventType', 'event_type', 'description', 'name']));
      const timestamp = readValue(event, timestampKeys);
      if (wanted.has(eventStatus) && isValidDateValue(timestamp)) return timestamp;
    }
    return undefined;
  };

  for (const key of historyKeys) {
    const found = inspect(order[key]);
    if (found !== undefined) return found;
  }

  const shipments = Array.isArray(order.shipments) ? order.shipments : [];
  for (const shipment of shipments) {
    if (!isRecord(shipment)) continue;
    for (const key of historyKeys) {
      const found = inspect(shipment[key]);
      if (found !== undefined) return found;
    }
    // Some carrier responses store normalized milestone timestamps directly.
    const directKeys: Record<string, string[]> = {
      shipped: ['shippedAt', 'shipped_at', 'labelCreatedAt', 'label_created_at'],
      in_transit: ['inTransitAt', 'in_transit_at'],
      out_for_delivery: ['outForDeliveryAt', 'out_for_delivery_at'],
      delivered: ['deliveredAt', 'delivered_at'],
    };
    const direct = readValue(shipment, directKeys[statusKey] ?? []);
    if (isValidDateValue(direct)) return direct;
  }

  if (statusKey === 'paid') {
    const created = readValue(order, ['placedAt', 'createdAt', 'created_at', 'orderDate', 'dateCreated']);
    if (isValidDateValue(created)) return created;
  }

  // updatedAt is only a reliable milestone proxy for the currently recorded status,
  // not for every earlier step.
  const currentStatus = normalizeStatusKey(readValue(order, ['status', 'orderStatus', 'order_status']));
  if (currentStatus === statusKey) {
    const updated = readValue(order, ['updatedAt', 'updated_at']);
    if (isValidDateValue(updated)) return updated;
  }
  return undefined;
}



function normalizeItem(value: unknown, index: number, fallbackLineTotal = 0) {
  const item = isRecord(value) ? value : {};
  const product = isRecord(item.product) ? item.product : {};
  const quantityValue = readNumber(item.quantity, 1);
  const quantity = quantityValue > 0 ? quantityValue : 1;

  // Price may live on the order item or its embedded product snapshot.
  const unitPrice = readNumber(
    readValue(item, ['unitPrice', 'unit_price', 'pricePerUnit', 'price', 'amountPerUnit']) ??
      readValue(product, ['unitPrice', 'unit_price', 'price', 'salePrice', 'amount']),
    0,
  );
  const explicitLineTotal = readNumber(
    readValue(item, ['lineTotal', 'line_total', 'totalPrice', 'total', 'amount']),
    0,
  );
  const calculatedLineTotal = unitPrice * quantity;
  const lineTotal =
    explicitLineTotal > 0
      ? explicitLineTotal
      : calculatedLineTotal > 0
        ? calculatedLineTotal
        : fallbackLineTotal;

  return {
    id: readString(
      readValue(item, ['id', '_id', 'productId', 'product_id']),
      `order-item-${index}`,
    ),
    productEmoji: readString(readValue(item, ['productEmoji', 'emoji']), '📦'),
    productName: readString(
      readValue(item, ['productName', 'name', 'title']) ??
        readValue(product, ['name', 'title', 'productName']),
      'Product',
    ),
    quantity,
    unitPrice: unitPrice > 0 ? unitPrice : lineTotal / quantity,
    lineTotal,
  };
}


// TODO(auth): ensure the backend verifies the authenticated user owns this order.

export default function ShopOrderDetailsPage() {

  const { orderId } = useParams<{ orderId: string }>();

  const { order, loading, error } = useOrder(orderId);



  const rawOrder = order as (typeof order & UnknownRecord) | null | undefined;



  const subtotalHint = readNumber(
    readValue(rawOrder ?? {}, ['subtotal', 'subTotal', 'itemsSubtotal']),
    0,
  );

  const sellerGroups = useMemo(() => {

    const groups = rawOrder?.sellerGroups ?? rawOrder?.seller_groups;

    if (!Array.isArray(groups)) return [];



    return groups.filter(isRecord).map((group, groupIndex) => {

      const rawItems = Array.isArray(group.items) ? group.items : [];
      const singleItemFallback = rawItems.length === 1 ? subtotalHint : 0;

      return {

        id: readString(readValue(group, ['id', '_id', 'storeId']), `seller-group-${groupIndex}`),

        storeName: readString(readValue(group, ['storeName', 'name']), 'Store'),

        status: readString(group.status, 'Processing'),

        trackingNumber: readString(readValue(group, ['trackingNumber', 'tracking_number'])),

        items: rawItems.map((item, itemIndex) => normalizeItem(item, itemIndex, singleItemFallback)),

      };

    });

  }, [rawOrder, subtotalHint]);



  const fallbackItems = useMemo(() => {

    if (!rawOrder) return [];



    const candidates = [rawOrder.items, rawOrder.orderItems, rawOrder.order_items, rawOrder.products];

    const rawItems = candidates.find(Array.isArray);

    if (!Array.isArray(rawItems)) return [];



    const singleItemFallback = rawItems.length === 1 ? subtotalHint : 0;
    return rawItems.map((item, index) => normalizeItem(item, index, singleItemFallback));

  }, [rawOrder, subtotalHint]);



  if (loading) {

    return (

      <div className="shop-page-root fk-shop">

        <ShopHeader />

        <div className="fk-container fk-page">

          <ShopLoading label="Loading order…" rows={4} />

        </div>

        <ShopFooter />

      </div>

    );

  }



  if (!order) {

    return (

      <div className="shop-page-root fk-shop">

        <ShopHeader />

        <main className="fk-container fk-page">

          <ShopBreadcrumbs

            items={[

              { label: 'Shop', to: '/shop' },

              { label: 'Orders', to: '/shop/orders' },

            ]}

          />

          <ShopEmptyState

            icon="📦"

            title={error ? 'Unable to load order' : 'Order not found'}

          />

          {error && <p role="alert">{error}</p>}

        </main>

        <ShopFooter />

      </div>

    );

  }



  const shippingAddressValue = readValue(rawOrder ?? {}, [

    'shippingAddress',

    'shipping_address',

    'deliveryAddress',

  ]);

  const shippingAddress = isRecord(shippingAddressValue) ? shippingAddressValue : {};

  const placedAt = readValue(rawOrder ?? {}, [

    'placedAt',

    'createdAt',

    'created_at',

    'orderDate',

    'dateCreated',

  ]);



  const orderNumber = readString(readValue(rawOrder ?? {}, ['orderNumber', 'number', 'reference']), orderId || 'Order details');

  const subtotal = subtotalHint || fallbackItems.reduce((sum, item) => sum + item.lineTotal, 0);

  const shippingTotal = readNumber(readValue(rawOrder ?? {}, ['shippingTotal', 'shippingCost', 'shipping', 'shippingAmount']), 0);

  const taxTotal = readNumber(readValue(rawOrder ?? {}, ['taxTotal', 'tax', 'taxAmount']), 0);

  const total = readNumber(readValue(rawOrder ?? {}, ['total', 'totalAmount', 'grandTotal', 'amountTotal']), subtotal + shippingTotal + taxTotal);

  const paymentStatus = readString(readValue(rawOrder ?? {}, ['paymentStatus', 'payment_status']), 'pending');
  const rawShipments = Array.isArray(rawOrder?.shipments) ? rawOrder.shipments : [];
  const firstShipment = rawShipments.find(isRecord);
  const orderStatus = readString(
    readValue(rawOrder ?? {}, ['status', 'orderStatus', 'order_status']) ??
      (firstShipment ? readValue(firstShipment, ['status', 'shipmentStatus', 'shipment_status']) : undefined),
    'pending',
  ).toLowerCase().replace(/[ -]/g, '_');
  const statusSteps = [
    { key: 'paid', label: 'Order placed', detail: 'Payment confirmed and order created.' },
    { key: 'processing', label: 'Processing', detail: 'The seller is preparing your order.' },
    { key: 'ready_to_ship', label: 'Ready to ship', detail: 'Your order is packed and awaiting dispatch.' },
    { key: 'shipped', label: 'Shipped', detail: 'The seller has dispatched your order.' },
    { key: 'in_transit', label: 'In transit', detail: 'Your package is on its way.' },
    { key: 'out_for_delivery', label: 'Out for delivery', detail: 'Your package is on the final delivery route.' },
    { key: 'delivered', label: 'Delivered', detail: 'Your order has been delivered.' },
  ];
  const statusAliases: Record<string, string> = {
    pending: 'pending',
    paid: 'paid',
    processing: 'processing',
    ready_to_ship: 'ready_to_ship',
    shipped: 'shipped',
    in_transit: 'in_transit',
    out_for_delivery: 'out_for_delivery',
    delivered: 'delivered',
  };
  const normalizedOrderStatus = statusAliases[orderStatus] ?? orderStatus;
  const statusIndex = statusSteps.findIndex((step) => step.key === normalizedOrderStatus);
  const isPaid = ['paid', 'processing', 'ready_to_ship', 'shipped', 'in_transit', 'out_for_delivery', 'delivered'].includes(normalizedOrderStatus)
    || paymentStatus.toLowerCase() === 'paid';
  const isCancelled = ['cancelled', 'refunded', 'returned'].includes(normalizedOrderStatus);
  const displayStatus = normalizedOrderStatus.replace(/_/g, ' ');



  return (

    <div className="shop-page-root fk-shop">

      <ShopHeader />

      <main className="fk-container fk-page">

        <ShopBreadcrumbs

          items={[

            { label: 'Shop', to: '/shop' },

            { label: 'Orders', to: '/shop/orders' },

            { label: orderNumber },

          ]}

        />



        <div>

          <div className="fk-page__head">

            <div>

              <h1>Order {orderNumber}</h1>

              <p>Placed {formatDate(placedAt)}</p>

            </div>

          </div>



          <section aria-label="Order progress" style={{ border: '1px solid #dce2ea', borderRadius: 12, padding: 18, margin: '18px 0 24px', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17 }}>Order progress</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ borderRadius: 999, padding: '6px 11px', background: isPaid ? '#e8f7ee' : '#fff4df', color: isPaid ? '#137a42' : '#8a5a00', fontSize: 13, fontWeight: 700 }}>
                  Payment: {paymentStatus.toLowerCase().replace(/_/g, ' ')}
                </span>
                <span style={{ borderRadius: 999, padding: '6px 11px', background: isCancelled ? '#fdecec' : '#edf3ff', color: isCancelled ? '#a61b1b' : '#244b88', fontSize: 13, fontWeight: 700 }}>
                  Fulfillment: {displayStatus}
                </span>
              </div>
            </div>
            {isCancelled ? (
              <p style={{ margin: 0, color: '#a61b1b', textTransform: 'capitalize' }}>This order is {displayStatus}.</p>
            ) : (
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 14 }}>
                {statusSteps.map((step, index) => {
                  const currentIndex = statusIndex >= 0 ? statusIndex : (isPaid ? 0 : -1);
                  const complete = index <= currentIndex;
                  const current = index === currentIndex;
                  const milestoneTimestamp = findStatusTimestamp(rawOrder ?? {}, step.key);
                  const timestampText = milestoneTimestamp !== undefined
                    ? formatDate(milestoneTimestamp)
                    : 'Time not recorded';
                  return (
                    <li key={step.key} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', opacity: complete ? 1 : 0.72 }}>
                      <span aria-hidden="true" style={{ width: 26, height: 26, flex: '0 0 26px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: complete ? '#167847' : '#e8edf3', color: complete ? '#fff' : '#526174', fontSize: 13, fontWeight: 700 }}>
                        {complete ? '✓' : index + 1}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700 }}>{step.label}{current ? ' · Current' : ''}</div>
                        <div style={{ color: '#657286', fontSize: 13, marginTop: 3 }}>{step.detail}</div>
                        <div style={{ color: milestoneTimestamp !== undefined ? '#344054' : '#8a94a3', fontSize: 12, marginTop: 4, fontWeight: 600 }}>
                          {milestoneTimestamp !== undefined ? `Date & time: ${timestampText}` : timestampText}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
            {readString(readValue(firstShipment ?? {}, ['carrier'])) && (
              <p style={{ margin: '16px 0 0', color: '#344054' }}>
                Carrier: <strong>{readString(readValue(firstShipment ?? {}, ['carrier']))}</strong>
                {readString(readValue(firstShipment ?? {}, ['trackingNumber', 'tracking_number'])) && <> · Tracking: <strong>{readString(readValue(firstShipment ?? {}, ['trackingNumber', 'tracking_number']))}</strong></>}
              </p>
            )}
          </section>

          <div className="order-details-layout">

            <div>

              {sellerGroups.length > 0 ? (

                sellerGroups.map((group) => (

                  <div className="order-review-group" key={group.id}>

                    <div className="order-review-group-store mono">

                      {group.storeName} · {group.status}

                    </div>

                    {group.items.map((item) => (

                      <div className="order-review-item" key={item.id}>

                        <span>

                          {item.productEmoji} {item.productName} × {item.quantity}

                        </span>

                        <span className="mono">{formatPrice(item.lineTotal)}</span>

                      </div>

                    ))}

                    {group.trackingNumber && (

                      <div className="mono" style={{ marginTop: 8 }}>

                        Tracking: {group.trackingNumber}

                      </div>

                    )}

                  </div>

                ))

              ) : fallbackItems.length > 0 ? (

                <div className="order-review-group">

                  <div className="order-review-group-store mono">

                    Order items · {readString(rawOrder?.status, 'Processing')}

                  </div>

                  {fallbackItems.map((item) => (

                    <div className="order-review-item" key={item.id}>

                      <span>

                        {item.productEmoji} {item.productName} × {item.quantity}

                      </span>

                      <span className="mono">{formatPrice(item.lineTotal)}</span>

                    </div>

                  ))}

                </div>

              ) : (

                <div className="order-review-group">

                  <div className="order-review-group-store mono">Order items</div>

                  <p>Item details are not available in the order response.</p>

                </div>

              )}

            </div>



            <div className="cart-panel cart-summary-panel">

              <h4>Order summary</h4>

              <div className="cart-summary-row">

                <span>Subtotal</span>

                <span className="mono">{formatPrice(subtotal)}</span>

              </div>

              <div className="cart-summary-row">

                <span>Shipping</span>

                <span className="mono">{formatPrice(shippingTotal)}</span>

              </div>

              <div className="cart-summary-row">

                <span>Tax</span>

                <span className="mono">{formatPrice(taxTotal)}</span>

              </div>

              <div className="cart-summary-row cart-summary-total">

                <span>Total</span>

                <span className="mono">{formatPrice(total)}</span>

              </div>



              <hr className="hairline" style={{ margin: '14px 0' }} />



              <div className="intl-example">

                <div className="row">

                  <span className="lbl">Ship to</span>

                  <span className="val">

                    {readString(readValue(shippingAddress, ['fullName', 'name', 'recipientName']), 'Not provided')}

                  </span>

                </div>

                <div className="row">

                  <span className="lbl">Address</span>

                  <span className="val" style={{ textAlign: 'right' }}>

                    {[

                      readString(readValue(shippingAddress, ['line1', 'street', 'addressLine1', 'address'])),

                      readString(readValue(shippingAddress, ['line2', 'apartment', 'addressLine2'])),

                      readString(shippingAddress.city),

                      readString(readValue(shippingAddress, ['state', 'region', 'province'])),

                      readString(readValue(shippingAddress, ['postalCode', 'zipCode', 'zip'])),

                      readString(shippingAddress.country),

                    ].filter(Boolean).join(', ') || 'Not provided'}

                  </span>

                </div>

                <div className="row">

                  <span className="lbl">Payment</span>

                  <span className="val" style={{ color: 'var(--green)' }}>

                    {paymentStatus}

                  </span>

                </div>

                {readString(readValue(rawOrder ?? {}, ['invoiceNumber', 'invoice_number', 'invoice'])) && (

                  <div className="row">

                    <span className="lbl">Invoice</span>

                    <span className="val">

                      {readString(readValue(rawOrder ?? {}, ['invoiceNumber', 'invoice_number', 'invoice']))}

                    </span>

                  </div>

                )}

                {readString(readValue(rawOrder ?? {}, ['carrier', 'shippingCarrier'])) && (

                  <div className="row">

                    <span className="lbl">Carrier</span>

                    <span className="val">

                      {readString(readValue(rawOrder ?? {}, ['carrier', 'shippingCarrier']))}

                    </span>

                  </div>

                )}

                {readString(readValue(rawOrder ?? {}, ['trackingNumber', 'tracking_number'])) && (

                  <div className="row">

                    <span className="lbl">Tracking</span>

                    <span className="val">

                      {readString(readValue(rawOrder ?? {}, ['trackingNumber', 'tracking_number']))}

                    </span>

                  </div>

                )}

              </div>

            </div>

          </div>

        </div>

      </main>

      <ShopFooter />

    </div>

  );

}
