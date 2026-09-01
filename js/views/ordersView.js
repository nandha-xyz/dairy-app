import { workflowEngine } from '../services/workflowEngine.js';
import { ordersRepository } from '../repositories/index.js';

export const ordersView = {
  render: (currentDateStr) => {
    const consolidated = workflowEngine.getConsolidatedRequirements(currentDateStr);
    const totalEstCost = consolidated.reduce((sum, item) => sum + item.estimatedCost, 0);

    // Get saved PO metadata or default to Draft
    const poRecord = ordersRepository.getByDate(currentDateStr) || {
      id: `po-${currentDateStr}`,
      date: currentDateStr,
      status: 'Draft',
      confirmedAt: null
    };

    const isConfirmed = poRecord.status === 'Confirmed';

    return `
      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem; flex-wrap:wrap; gap:1rem;">
        <div>
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <h2 style="font-size: 1.4rem; font-weight: 800;">Consolidated Purchase Orders</h2>
            <span class="badge ${isConfirmed ? 'badge-confirmed' : 'badge-draft'}" id="po-status-badge">
              ${isConfirmed ? 'Confirmed & Dispatched' : 'Draft (In Preparation)'}
            </span>
          </div>
          <p style="font-size: 0.85rem; color: var(--text-muted);">Aggregate supplier procurement orders for ${currentDateStr}</p>
        </div>
        
        <div style="display:flex; align-items:center; gap:1.5rem;">
          <div style="text-align:right;">
            <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Total Procurement Cost</span>
            <div style="font-size:1.6rem; font-weight:800; color:var(--accent-primary);" id="po-total-cost-header">${workflowEngine.formatCurrency(totalEstCost)}</div>
          </div>
          
          <div style="display:flex; gap:0.5rem;">
            ${isConfirmed ? `
              <button class="btn btn-secondary" id="btn-print-po">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Print PO Sheet
              </button>
              <button class="btn btn-secondary" id="btn-reopen-po" style="color:var(--text-secondary);">Unlock & Edit</button>
            ` : `
              <button class="btn btn-secondary" id="btn-save-po-draft">Save Draft</button>
              <button class="btn btn-primary" id="btn-confirm-po" style="font-weight:700;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Confirm & Dispatch PO
              </button>
            `}
          </div>
        </div>
      </div>

      <!-- Info Banner -->
      <div class="card" style="margin-bottom: 1.5rem; background: ${isConfirmed ? '#F0FDF4' : '#EFF6FF'}; border-color: ${isConfirmed ? '#BBF7D0' : '#BFDBFE'};">
        <div style="display:flex; gap: 0.75rem; align-items:flex-start; justify-content:space-between; flex-wrap:wrap;">
          <div style="display:flex; gap:0.75rem; align-items:flex-start;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${isConfirmed ? '#166534' : '#2563EB'}" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            <div style="font-size: 0.875rem; color: ${isConfirmed ? '#14532D' : '#1E40AF'};">
              <strong>${isConfirmed ? 'PO Status: Confirmed & Dispatched' : 'Supplier Buffer & Confirmation Control:'}</strong> 
              ${isConfirmed 
                ? `This purchase order was officially confirmed and dispatched to the dairy processing plant on ${poRecord.confirmedAt || 'Today'}.` 
                : 'Adjust supplier order quantities to include safety buffer stock if needed, then click <strong>Confirm & Dispatch PO</strong> to finalize order procurement.'}
            </div>
          </div>
        </div>
      </div>

      <!-- Consolidated PO Table -->
      <div class="card" id="po-printable-area">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th style="text-align:right;">Total Store Demand</th>
                <th style="text-align:center; width: 180px;">Supplier Order Qty</th>
                <th>Unit</th>
                <th style="text-align:right;">Purchase Rate</th>
                <th style="text-align:right;">Estimated Cost</th>
              </tr>
            </thead>
            <tbody id="po-table-body">
              ${consolidated.map(item => `
                <tr>
                  <td style="font-weight:700;">${item.product.name}</td>
                  <td><span class="badge badge-draft">${item.product.category}</span></td>
                  <td style="text-align:right; font-weight:700; color:var(--text-secondary);">${item.totalRequired}</td>
                  <td style="text-align:center;">
                    ${isConfirmed ? `
                      <span style="font-weight:800; font-size:1.05rem; color:var(--accent-primary);">${item.actualOrderQty}</span>
                    ` : `
                      <input 
                        type="number" 
                        class="form-input po-qty-input" 
                        data-product-id="${item.product.id}"
                        data-purchase-price="${item.purchasePrice}"
                        value="${item.actualOrderQty}" 
                        min="0"
                        style="width: 110px; text-align:center; font-weight:700; color:var(--accent-primary);"
                      />
                    `}
                  </td>
                  <td style="color:var(--text-muted);">${item.unit}</td>
                  <td style="text-align:right;">₹${item.purchasePrice}</td>
                  <td style="text-align:right; font-weight:700; color:var(--text-primary);" class="po-item-cost">
                    ${workflowEngine.formatCurrency(item.estimatedCost)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background:var(--bg-card-subtle); font-size:1rem;">
                <td colspan="6" style="text-align:right; font-weight:800;">Total Purchase Order Value:</td>
                <td style="text-align:right; font-weight:800; color:var(--accent-primary);" id="po-footer-total">
                  ${workflowEngine.formatCurrency(totalEstCost)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  },

  bindEvents: (currentDateStr) => {
    const tableBody = document.getElementById('po-table-body');
    if (!tableBody) return;

    const recalculatePOTotals = () => {
      let totalCost = 0;
      const inputs = tableBody.querySelectorAll('.po-qty-input');
      inputs.forEach(input => {
        const qty = parseFloat(input.value) || 0;
        const rate = parseFloat(input.dataset.purchasePrice) || 0;
        const rowCost = qty * rate;
        totalCost += rowCost;

        const row = input.closest('tr');
        if (row) {
          const costCol = row.querySelector('.po-item-cost');
          if (costCol) costCol.textContent = workflowEngine.formatCurrency(rowCost);
        }
      });

      const formatted = workflowEngine.formatCurrency(totalCost);
      const headerElem = document.getElementById('po-total-cost-header');
      const footerElem = document.getElementById('po-footer-total');
      if (headerElem) headerElem.textContent = formatted;
      if (footerElem) footerElem.textContent = formatted;
    };

    // Listen to quantity changes
    tableBody.addEventListener('input', (e) => {
      if (e.target.classList.contains('po-qty-input')) {
        recalculatePOTotals();
      }
    });

    // Save PO Draft
    document.getElementById('btn-save-po-draft')?.addEventListener('click', () => {
      const inputs = tableBody.querySelectorAll('.po-qty-input');
      inputs.forEach(input => {
        const productId = input.dataset.productId;
        const actualQty = parseFloat(input.value) || 0;
        ordersRepository.setPOBuffer(`${currentDateStr}_${productId}`, actualQty);
      });

      ordersRepository.savePO({
        id: `po-${currentDateStr}`,
        date: currentDateStr,
        status: 'Draft'
      });

      alert('Purchase Order draft saved successfully.');
    });

    // Confirm & Dispatch PO Button
    document.getElementById('btn-confirm-po')?.addEventListener('click', () => {
      const inputs = tableBody.querySelectorAll('.po-qty-input');
      inputs.forEach(input => {
        const productId = input.dataset.productId;
        const actualQty = parseFloat(input.value) || 0;
        ordersRepository.setPOBuffer(`${currentDateStr}_${productId}`, actualQty);
      });

      const consolidated = workflowEngine.getConsolidatedRequirements(currentDateStr);
      const totalEstCost = consolidated.reduce((sum, item) => sum + item.estimatedCost, 0);

      const confirmMessage = `Authorization Required:\n\nAre you sure you want to CONFIRM & DISPATCH today's Purchase Order for ${currentDateStr}?\n\n• Total Items: ${consolidated.length} Products\n• Total PO Procurement Value: ${workflowEngine.formatCurrency(totalEstCost)}\n\nThis will lock the purchase order quantities for processing plant dispatch.`;

      if (confirm(confirmMessage)) {
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        ordersRepository.savePO({
          id: `po-${currentDateStr}`,
          date: currentDateStr,
          status: 'Confirmed',
          confirmedAt: `Today at ${nowTime}`,
          totalCost: totalEstCost
        });

        // Refresh PO View
        window.app.renderCurrentView();
      }
    });

    // Unlock & Edit PO
    document.getElementById('btn-reopen-po')?.addEventListener('click', () => {
      ordersRepository.savePO({
        id: `po-${currentDateStr}`,
        date: currentDateStr,
        status: 'Draft'
      });
      window.app.renderCurrentView();
    });

    // Print PO Sheet
    document.getElementById('btn-print-po')?.addEventListener('click', () => {
      window.print();
    });
  }
};
