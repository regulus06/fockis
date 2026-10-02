export const SELLER_REFRESH_EVENT =
"seller-data-refresh";

export function refreshSellerData() {
window.dispatchEvent(
new Event(SELLER_REFRESH_EVENT)
);
}
