import { workflowEngine } from '../services/workflowEngine.js';
import { requirementsRepository, productsRepository, storesRepository, dataStore } from '../repositories/index.js';

export const requirementEntryView = {
  renderDrawerContent: (storeId, dateStr) => {
    const store = storesRepository.getById(storeId);
    if (!store) {
      return `
        <div class="drawer-header">
          <h2>Store not found</h2>
          <button class="btn btn-secondary btn-sm" id="btn-close-drawer">✕</button>
        </div>
        <div class="drawer-body">
          <p style="color:var(--text-muted);">Please select a valid store from the stores directory.</p>
        </div>
      `;
    }
    const requirement = workflowEngine.getStoreRequirementForDate(storeId, dateStr);
    const allProducts = productsRepository.getActive();

    let subtotal = 0;
    let taxAmount = 0;

    const itemsRows = requirement.items.map((item, index) => {
      const product = productsRepository.getById(item.productId);
      const rowAmount = (item.quantity || 0) * item.rate;
      subtotal += rowAmount;
      const rowTax = rowAmount * ((product ? product.taxPercent : 0) / 100);
      taxAmount += rowTax;

      return `
        <tr class="entry-row" data-product-id="${item.productId}">
          <td style="font-weight: 600;">
            ${item.productName}
            <div style="font-size:0.75rem; color:var(--text-muted);">${product ? product.sku : ''}</div>
          </td>
          <td style="text-align: center; color: var(--text-muted); font-weight: 500;">
            ${item.quantity || 0}
          </td>
          <td style="text-align: center;">
            <div class="qty-stepper">
              <button type="button" class="btn-step btn-step-minus" data-product-id="${item.productId}">-</button>
              <input 
                type="number" 
                class="form-input req-qty-input" 
                data-product-id="${item.productId}" 
                data-rate="${item.rate}"
                data-tax-percent="${product ? product.taxPercent : 0}"
                value="${item.quantity}" 
                min="0" 
                step="1"
                tabindex="${index + 1}"
                style="width: 70px; text-align: center; font-weight: 700; color: var(--accent-primary); border:none; border-left:1px solid #E2E8F0; border-right:1px solid #E2E8F0; border-radius:0;"
              />
              <button type="button" class="btn-step btn-step-plus" data-product-id="${item.productId}">+</button>
            </div>
          </td>
          <td style="color: var(--text-muted);">${item.unit}</td>
          <td style="text-align: right;">₹${item.rate}</td>
          <td style="text-align: right; font-weight: 700;" class="item-amount-col">
            ${workflowEngine.formatCurrency(rowAmount)}
          </td>
          <td style="text-align: center;">
            <button class="btn btn-secondary btn-sm btn-remove-row" style="border:none; color:#DC2626; padding:0.2rem 0.5rem;" title="Remove product row">✕</button>
          </td>
        </tr>
      `;
    }).join('');

    const grandTotal = Math.round(subtotal + taxAmount);

    return `
      <div class="drawer-header">
        <div>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <h2 style="font-size: 1.25rem; font-weight: 800;">${store.name}</h2>
            <span class="badge badge-${requirement.status.toLowerCase()}">${requirement.status}</span>
          </div>
          <p style="font-size: 0.85rem; color: var(--text-muted);">${store.code} • ${store.location} • ${dateStr}</p>
        </div>
        <button class="btn btn-secondary btn-sm" id="btn-close-drawer" style="border:none; font-size:1.2rem;">✕</button>
      </div>

      <div class="drawer-body">
        
        <!-- Action Toolbar with prominent Add Product Button -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.25rem; background: var(--bg-card-subtle); padding: 0.75rem 1rem; border-radius: var(--radius-sm); flex-wrap: wrap; gap: 0.5rem;">
          <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">
            ⚡ Fast Entry Mode (Tab to move between items)
          </div>
          <div style="display:flex; gap: 0.5rem; align-items: center;">
            <button class="btn btn-secondary btn-sm" id="btn-copy-prev">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
              Copy Previous Day
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-clear-all" style="color: #DC2626;">Clear All</button>
          </div>
        </div>

        <!-- Product Requirements Input Table -->
        <div class="table-container entry-table" style="margin-bottom: 1rem;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th style="text-align: center;">Prev Qty</th>
                <th style="text-align: center;">Today's Qty</th>
                <th>Unit</th>
                <th style="text-align: right;">Rate</th>
                <th style="text-align: right;">Amount</th>
                <th style="text-align: center;"></th>
              </tr>
            </thead>
            <tbody id="entry-table-body">
              ${itemsRows ? itemsRows : `
                <tr>
                  <td colspan="7">
                    <div class="empty-state" style="padding:1.5rem;">
                      No products in catalog yet. Click "Add Product from Catalog" below.
                    </div>
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>

        <!-- High-Visibility Add Product Bar -->
        <div style="margin-bottom: 1.5rem; background: #EFF6FF; border: 2px dashed #2563EB; padding: 1rem; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
          <div style="display:flex; align-items:center; gap:0.6rem; flex:1; min-width: 280px;">
            <span style="font-weight:800; font-size:0.9rem; color:#1E40AF;">➕ Add Product to Order:</span>
            <select id="select-add-product" class="form-select" style="flex:1; font-weight:600; border-color: #3B82F6;">
              <option value="">-- Select Product from Catalog --</option>
              ${allProducts.map(p => `
                <option value="${p.id}">${p.name} (${p.unit}) - ₹${p.sellingPrice}</option>
              `).join('')}
            </select>
            <button class="btn btn-primary" id="btn-add-product-row" style="font-weight:700; background: #2563EB;">+ Add Item</button>
          </div>
        </div>

        <!-- Sticky Totals Summary Box -->
        <div class="summary-box">
          <div class="summary-row">
            <span>Subtotal:</span>
            <span id="summary-subtotal" style="font-weight:600;">${workflowEngine.formatCurrency(subtotal)}</span>
          </div>
          <div class="summary-row">
            <span>Estimated Tax (GST):</span>
            <span id="summary-tax" style="font-weight:600;">${workflowEngine.formatCurrency(taxAmount)}</span>
          </div>
          <div class="summary-row">
            <span>Discount:</span>
            <span style="font-weight:600; color: #10B981;">₹0</span>
          </div>
          <div class="summary-row total">
            <span>Grand Total:</span>
            <span id="summary-grandtotal">${workflowEngine.formatCurrency(grandTotal)}</span>
          </div>
        </div>

      </div>

      <div class="drawer-footer">
        <button class="btn btn-secondary" id="btn-save-draft">Save Draft</button>
        <button class="btn btn-primary" id="btn-confirm-req" data-store-id="${storeId}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Confirm Requirement
        </button>
      </div>
    `;
  },

  bindEvents: (storeId, dateStr, onComplete) => {
    const tableBody = document.getElementById('entry-table-body');
    const productSelect = document.getElementById('select-add-product');
    const addProductBtn = document.getElementById('btn-add-product-row');

    const recalculateTotals = () => {
      let subtotal = 0;
      let taxAmount = 0;

      const inputs = tableBody.querySelectorAll('.req-qty-input');
      inputs.forEach(input => {
        let qty = parseFloat(input.value) || 0;
        if (qty < 0) { qty = 0; input.value = 0; }
        const rate = parseFloat(input.dataset.rate) || 0;
        const taxPct = parseFloat(input.dataset.taxPercent) || 0;

        const rowAmount = qty * rate;
        subtotal += rowAmount;
        taxAmount += rowAmount * (taxPct / 100);

        const rowElem = input.closest('tr');
        if (rowElem) {
          const col = rowElem.querySelector('.item-amount-col');
          if (col) col.textContent = workflowEngine.formatCurrency(rowAmount);
        }
      });

      const grandTotal = Math.round(subtotal + taxAmount);
      document.getElementById('summary-subtotal').textContent = workflowEngine.formatCurrency(subtotal);
      document.getElementById('summary-tax').textContent = workflowEngine.formatCurrency(taxAmount);
      document.getElementById('summary-grandtotal').textContent = workflowEngine.formatCurrency(grandTotal);
    };

    // Quantity changes & Touch Stepper click handlers
    tableBody.addEventListener('input', (e) => {
      if (e.target.classList.contains('req-qty-input')) {
        recalculateTotals();
      }
    });

    tableBody.addEventListener('click', (e) => {
      const minusBtn = e.target.closest('.btn-step-minus');
      const plusBtn = e.target.closest('.btn-step-plus');

      if (minusBtn) {
        const row = minusBtn.closest('tr');
        const input = row.querySelector('.req-qty-input');
        if (input) {
          const currentVal = parseFloat(input.value) || 0;
          if (currentVal > 0) {
            input.value = currentVal - 1;
            recalculateTotals();
          }
        }
      }

      if (plusBtn) {
        const row = plusBtn.closest('tr');
        const input = row.querySelector('.req-qty-input');
        if (input) {
          const currentVal = parseFloat(input.value) || 0;
          input.value = currentVal + 1;
          recalculateTotals();
        }
      }
    });

    // Remove row
    tableBody.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.btn-remove-row');
      if (removeBtn) {
        const row = removeBtn.closest('tr');
        if (row) {
          row.remove();
          recalculateTotals();
        }
      }
    });

    // Add Product Row
    if (addProductBtn && productSelect) {
      addProductBtn.addEventListener('click', () => {
        const productId = productSelect.value;
        if (!productId) {
          alert('Please select a product from the dropdown catalog first.');
          return;
        }

        const product = productsRepository.getById(productId);
        if (!product) return;

        // Check if row already exists
        let existingInput = tableBody.querySelector(`.req-qty-input[data-product-id="${productId}"]`);
        if (existingInput) {
          existingInput.value = (parseFloat(existingInput.value) || 0) + 1;
          existingInput.focus();
          const tr = existingInput.closest('tr');
          if (tr) {
            tr.style.backgroundColor = '#EFF6FF';
            setTimeout(() => tr.style.backgroundColor = '', 1000);
          }
          recalculateTotals();
          return;
        }

        // Insert new row into table
        const newRow = document.createElement('tr');
        newRow.className = 'entry-row';
        newRow.dataset.productId = product.id;
        newRow.style.backgroundColor = '#EFF6FF';
        newRow.innerHTML = `
          <td style="font-weight: 600;">
            ${product.name}
            <div style="font-size:0.75rem; color:var(--text-muted);">${product.sku}</div>
          </td>
          <td style="text-align: center; color: var(--text-muted); font-weight: 500;">
            0
          </td>
          <td style="text-align: center;">
            <div class="qty-stepper">
              <button type="button" class="btn-step btn-step-minus" data-product-id="${product.id}">-</button>
              <input 
                type="number" 
                class="form-input req-qty-input" 
                data-product-id="${product.id}" 
                data-rate="${product.sellingPrice}"
                data-tax-percent="${product.taxPercent}"
                value="1" 
                min="0" 
                step="1"
                style="width: 70px; text-align: center; font-weight: 700; color: var(--accent-primary); border:none; border-left:1px solid #E2E8F0; border-right:1px solid #E2E8F0; border-radius:0;"
              />
              <button type="button" class="btn-step btn-step-plus" data-product-id="${product.id}">+</button>
            </div>
          </td>
          <td style="color: var(--text-muted);">${product.unit}</td>
          <td style="text-align: right;">₹${product.sellingPrice}</td>
          <td style="text-align: right; font-weight: 700;" class="item-amount-col">
            ${workflowEngine.formatCurrency(product.sellingPrice)}
          </td>
          <td style="text-align: center;">
            <button class="btn btn-secondary btn-sm btn-remove-row" style="border:none; color:#DC2626; padding:0.2rem 0.5rem;" title="Remove product row">✕</button>
          </td>
        `;

        tableBody.appendChild(newRow);
        setTimeout(() => newRow.style.backgroundColor = '', 1000);
        productSelect.value = '';

        const newQtyInput = newRow.querySelector('.req-qty-input');
        if (newQtyInput) newQtyInput.focus();

        recalculateTotals();
      });
    }

    // Close button
    document.getElementById('btn-close-drawer')?.addEventListener('click', () => {
      document.getElementById('requirement-drawer').classList.remove('open');
      document.getElementById('modal-backdrop').classList.remove('open');
    });

    // Clear all
    document.getElementById('btn-clear-all')?.addEventListener('click', () => {
      tableBody.querySelectorAll('.req-qty-input').forEach(i => i.value = 0);
      recalculateTotals();
    });

    // Copy Previous Day
    document.getElementById('btn-copy-prev')?.addEventListener('click', () => {
      const store = storesRepository.getById(storeId);
      if (store.recurringRequirements) {
        tableBody.querySelectorAll('.req-qty-input').forEach(input => {
          const pid = input.dataset.productId;
          if (store.recurringRequirements[pid]) {
            input.value = store.recurringRequirements[pid];
          }
        });
        recalculateTotals();
      }
    });

    // Save Draft
    document.getElementById('btn-save-draft')?.addEventListener('click', async () => {
      const items = [];
      tableBody.querySelectorAll('.req-qty-input').forEach(input => {
        const productId = input.dataset.productId;
        const qty = parseFloat(input.value) || 0;
        const rate = parseFloat(input.dataset.rate) || 0;
        const product = productsRepository.getById(productId);
        items.push({
          productId,
          productName: product ? product.name : '',
          unit: product ? product.unit : '',
          rate,
          quantity: qty,
          amount: qty * rate
        });
      });

      const store = storesRepository.getById(storeId);
      const req = {
        id: `req-${dateStr}-${storeId}`,
        storeId,
        storeCode: store.code,
        storeName: store.name,
        location: store.location,
        date: dateStr,
        status: 'Draft',
        items,
        totalAmount: items.reduce((s, i) => s + i.amount, 0),
        lastUpdated: 'Just now (Draft)'
      };

      try {
        await requirementsRepository.save(req);
        await dataStore.syncAllFromSupabase();
        document.getElementById('requirement-drawer').classList.remove('open');
        document.getElementById('modal-backdrop').classList.remove('open');
        if (onComplete) onComplete();
      } catch (err) {
        alert(`⚠️ Supabase Save Failed: ${err.message}`);
      }
    });

    // Confirm Requirement
    document.getElementById('btn-confirm-req')?.addEventListener('click', async () => {
      if (confirm(`Confirm today's requirement for ${storesRepository.getById(storeId).name}?\nThis will generate the store invoice and update consolidated purchase orders.`)) {
        const items = [];
        tableBody.querySelectorAll('.req-qty-input').forEach(input => {
          const productId = input.dataset.productId;
          const qty = parseFloat(input.value) || 0;
          const rate = parseFloat(input.dataset.rate) || 0;
          const product = productsRepository.getById(productId);
          items.push({
            productId,
            productName: product ? product.name : '',
            unit: product ? product.unit : '',
            rate,
            quantity: qty,
            amount: qty * rate
          });
        });

        const store = storesRepository.getById(storeId);
        const req = {
          id: `req-${dateStr}-${storeId}`,
          storeId,
          storeCode: store.code,
          storeName: store.name,
          location: store.location,
          date: dateStr,
          status: 'Confirmed',
          items,
          totalAmount: items.reduce((s, i) => s + i.amount, 0),
          lastUpdated: 'Today, Confirmed'
        };

        try {
          await requirementsRepository.save(req);

          // Also update store default recurring requirements
          if (!store.recurringRequirements) store.recurringRequirements = {};
          items.forEach(i => {
            if (i.quantity > 0) {
              store.recurringRequirements[i.productId] = i.quantity;
            }
          });
          await storesRepository.save(store);
          await dataStore.syncAllFromSupabase();

          document.getElementById('requirement-drawer').classList.remove('open');
          document.getElementById('modal-backdrop').classList.remove('open');
          if (onComplete) onComplete();
        } catch (err) {
          alert(`⚠️ Supabase Save Failed: ${err.message}`);
        }
      }
    });
  }
};
