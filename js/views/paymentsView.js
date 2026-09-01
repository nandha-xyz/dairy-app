import { paymentsRepository, invoicesRepository, storesRepository } from '../repositories/index.js';
import { workflowEngine } from '../services/workflowEngine.js';

export const paymentsView = {
  renderList: (statusFilter = 'All') => {
    let invoices = invoicesRepository.getAll();
    const payments = paymentsRepository.getAll();

    const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
    const totalOutstanding = invoices.reduce((s, i) => s + (i.outstandingAmount || 0), 0);
    const overdueCount = invoices.filter(i => i.status === 'Overdue').length;

    if (statusFilter !== 'All') {
      if (statusFilter === 'Paid') invoices = invoices.filter(i => i.status === 'Paid');
      else if (statusFilter === 'Unpaid') invoices = invoices.filter(i => i.outstandingAmount > 0 && i.paidAmount === 0);
      else if (statusFilter === 'Partially Paid') invoices = invoices.filter(i => i.status === 'Partially Paid');
      else if (statusFilter === 'Overdue') invoices = invoices.filter(i => i.status === 'Overdue');
    }

    return `
      <!-- Top KPIs -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Total Collected</div>
          <div class="kpi-value" style="color:#059669;">${workflowEngine.formatCurrency(totalCollected)}</div>
          <div class="kpi-subtext">All time payment receipts</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Outstanding Balance</div>
          <div class="kpi-value" style="color:#DC2626;">${workflowEngine.formatCurrency(totalOutstanding)}</div>
          <div class="kpi-subtext">Unpaid invoices balance</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Overdue Invoices</div>
          <div class="kpi-value" style="color:#D97706;">${overdueCount}</div>
          <div class="kpi-subtext">Requires follow-up</div>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="filter-toolbar">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" id="payment-search-input" class="form-input" placeholder="Search store name, invoice #..." />
        </div>

        <select id="payment-status-filter" class="form-select">
          <option value="All" ${statusFilter === 'All' ? 'selected' : ''}>All Payment Statuses</option>
          <option value="Unpaid" ${statusFilter === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
          <option value="Partially Paid" ${statusFilter === 'Partially Paid' ? 'selected' : ''}>Partially Paid</option>
          <option value="Paid" ${statusFilter === 'Paid' ? 'selected' : ''}>Paid</option>
          <option value="Overdue" ${statusFilter === 'Overdue' ? 'selected' : ''}>Overdue</option>
        </select>
      </div>

      <!-- Payments/Invoices Account Table -->
      <div class="card">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Store</th>
                <th>Invoice #</th>
                <th>Date</th>
                <th style="text-align:right;">Invoice Amount</th>
                <th style="text-align:right;">Paid</th>
                <th style="text-align:right;">Outstanding</th>
                <th>Status</th>
                <th style="text-align:right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${invoices.length > 0 ? invoices.map(inv => `
                <tr>
                  <td style="font-weight:700; color:var(--accent-primary);">${inv.storeName}</td>
                  <td style="font-family:monospace; font-weight:600;">${inv.invoiceNumber}</td>
                  <td>${inv.date}</td>
                  <td style="text-align:right; font-weight:600;">${workflowEngine.formatCurrency(inv.grandTotal)}</td>
                  <td style="text-align:right; color:#059669;">${workflowEngine.formatCurrency(inv.paidAmount)}</td>
                  <td style="text-align:right; font-weight:700; color:${inv.outstandingAmount > 0 ? '#DC2626' : '#059669'};">${workflowEngine.formatCurrency(inv.outstandingAmount)}</td>
                  <td>
                    <span class="badge badge-${inv.status.toLowerCase().replace(/\s+/g, '')}">${inv.status}</span>
                  </td>
                  <td style="text-align:right;">
                    ${inv.outstandingAmount > 0 ? `
                      <button class="btn btn-primary btn-sm btn-record-payment-modal" data-invoice-id="${inv.id}">+ Record Payment</button>
                    ` : `
                      <span style="font-size:0.8rem; color:#059669; font-weight:600;">✓ Fully Paid</span>
                    `}
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="8">
                    <div class="empty-state">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                      <h3>No payment receipts or outstanding accounts</h3>
                      <p>Payment records will appear here once invoices are issued to stores.</p>
                    </div>
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderRecordPaymentModal: (invoiceId) => {
    const inv = invoicesRepository.getById(invoiceId);
    if (!inv) return '';

    return `
      <div class="modal-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; padding-bottom:1rem; border-bottom:1px solid var(--border-color);">
          <h3 style="font-size:1.2rem; font-weight:800;">Record Payment Receipt</h3>
          <button class="btn btn-secondary btn-sm" id="btn-close-modal" style="border:none; font-size:1.2rem;">✕</button>
        </div>

        <div style="background:var(--bg-card-subtle); padding:1rem; border-radius:var(--radius-sm); margin-bottom:1.25rem;">
          <div style="font-weight:700;">${inv.storeName}</div>
          <div style="font-size:0.85rem; color:var(--text-muted);">Invoice: ${inv.invoiceNumber} • Outstanding: <strong style="color:#DC2626;">${workflowEngine.formatCurrency(inv.outstandingAmount)}</strong></div>
        </div>

        <form id="payment-form">
          <input type="hidden" name="invoiceId" value="${inv.id}" />
          <input type="hidden" name="storeId" value="${inv.storeId}" />
          <input type="hidden" name="storeName" value="${inv.storeName}" />

          <div class="form-group">
            <label class="form-label">Payment Amount (₹)</label>
            <input type="number" name="amount" class="form-input" value="${inv.outstandingAmount}" max="${inv.outstandingAmount}" min="1" required style="font-size:1.1rem; font-weight:700; color:var(--accent-primary);" />
          </div>

          <div class="form-group">
            <label class="form-label">Payment Date</label>
            <input type="date" name="date" class="form-input" value="${new Date().toISOString().split('T')[0]}" required />
          </div>

          <div class="form-group">
            <label class="form-label">Payment Method</label>
            <select name="method" class="form-select" required>
              <option value="UPI">UPI / GPay / PhonePe</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer / NEFT</option>
              <option value="Card">Credit / Debit Card</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Reference / Transaction Number</label>
            <input type="text" name="referenceNumber" class="form-input" placeholder="e.g. UPI/109283091823 or Cheque #10293" required />
          </div>

          <div class="form-group">
            <label class="form-label">Notes (Optional)</label>
            <input type="text" name="notes" class="form-input" placeholder="Daily payment settlement" />
          </div>

          <div style="display:flex; justify-content:flex-end; gap:0.75rem; margin-top:1.5rem;">
            <button type="button" class="btn btn-secondary" id="btn-cancel-modal">Cancel</button>
            <button type="submit" class="btn btn-success">Save Payment Receipt</button>
          </div>
        </form>
      </div>
    `;
  }
};
