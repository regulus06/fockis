import type { CartSellerGroup } from '../../types/cart.types';
import { CartSellerGroup as CartSellerGroupComponent } from './CartSellerGroup';
import { EmptyCart } from './EmptyCart';
import { useCart } from '../../hooks/useCart';

export function CartList({
  groups,
}: {
  groups: CartSellerGroup[];
}) {
  const {
    selectedLineIds,
    allSelected,
    selectAll,
    deselectAll,
  } = useCart();

  if (groups.length === 0) {
    return <EmptyCart />;
  }

  const totalItems = groups.reduce(
    (total, group) =>
      total + group.items.length,
    0,
  );

  const hasSelectedItems =
    selectedLineIds.length > 0;

  const everythingSelected =
    totalItems > 0 && allSelected;

  return (
    <div className="cart-list">
      {/* ================================================================ */}
      {/* CART SELECTION TOOLBAR                                            */}
      {/* ================================================================ */}

      <div className="cart-selection-toolbar">
        <label className="cart-selection-master">
          <input
            type="checkbox"
            checked={everythingSelected}
            ref={(element) => {
              if (!element) return;

              element.indeterminate =
                hasSelectedItems &&
                !everythingSelected;
            }}
            onChange={(event) => {
              if (event.target.checked) {
                selectAll();
              } else {
                deselectAll();
              }
            }}
          />

          <span>
            {everythingSelected
              ? 'Deselect all'
              : 'Select all'}
          </span>
        </label>

        <span className="cart-selection-count">
          {selectedLineIds.length}{' '}
          selected
        </span>
      </div>

      {/* ================================================================ */}
      {/* SELLER GROUPS                                                    */}
      {/* ================================================================ */}

      {groups.map((group) => (
        <CartSellerGroupComponent
          key={group.storeId}
          group={group}
        />
      ))}
    </div>
  );
}