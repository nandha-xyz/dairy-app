import { invoicesRepository, storesRepository } from '../repositories/index.js';
import { workflowEngine } from '../services/workflowEngine.js';

export const invoicesView = {
  renderList: (statusFilter = 'All') => {
    let invoices = invoicesRepository.getAll();
    if (statusFilter !== 'All') {
      invoices = invoices.filter(i => i.status === statusFilter);
    }

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem;">
        <div>
          <h2 style="font-size: 1.4rem; font-weight: 800;">Store Invoices</h2>
          <p style="font-size: 0.85rem; color: var(--text-muted);">${invoices.length} invoices issued</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="filter-toolbar">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" id="invoice-search-input" class="form-input" placeholder="Search invoice #, store name..." />
        </div>

        <select id="invoice-status-filter" class="form-select">
          <option value="All" ${statusFilter === 'All' ? 'selected' : ''}>All Statuses</option>
          <option value="Generated" ${statusFilter === 'Generated' ? 'selected' : ''}>Generated</option>
          <option value="Partially Paid" ${statusFilter === 'Partially Paid' ? 'selected' : ''}>Partially Paid</option>
          <option value="Paid" ${statusFilter === 'Paid' ? 'selected' : ''}>Paid</option>
          <option value="Overdue" ${statusFilter === 'Overdue' ? 'selected' : ''}>Overdue</option>
        </select>
      </div>

      <!-- Invoices Table -->
      <div class="card">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Store</th>
                <th>Location</th>
                <th>Date</th>
                <th style="text-align:right;">Grand Total</th>
                <th style="text-align:right;">Paid</th>
                <th style="text-align:right;">Outstanding</th>
                <th>Status</th>
                <th style="text-align:right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${invoices.length > 0 ? invoices.map(inv => `
                <tr>
                  <td style="font-family: monospace; font-weight: 700;">${inv.invoiceNumber}</td>
                  <td style="font-weight:600; color:var(--accent-primary);">${inv.storeName}</td>
                  <td>${inv.location}</td>
                  <td>${inv.date}</td>
                  <td style="text-align:right; font-weight:700;">${workflowEngine.formatCurrency(inv.grandTotal)}</td>
                  <td style="text-align:right; color:#059669;">${workflowEngine.formatCurrency(inv.paidAmount)}</td>
                  <td style="text-align:right; font-weight:700; color:${inv.outstandingAmount > 0 ? '#DC2626' : '#059669'};">${workflowEngine.formatCurrency(inv.outstandingAmount)}</td>
                  <td>
                    <span class="badge badge-${inv.status.toLowerCase().replace(/\s+/g, '')}">${inv.status}</span>
                  </td>
                  <td style="text-align:right; white-space:nowrap;">
                    <button class="btn btn-secondary btn-sm btn-view-invoice" data-invoice-id="${inv.id}">Preview & Pay</button>
                    <button class="btn btn-secondary btn-sm btn-delete-invoice" data-invoice-id="${inv.id}" style="color:#DC2626; border-color:#FCA5A5;">Delete</button>
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="9">
                    <div class="empty-state">
                      <div class="empty-state-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                      </div>
                      <h3>No store invoices generated yet</h3>
                      <p>Confirm store daily requirements to automatically generate billing invoices and track payment collections.</p>
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

  renderDetail: (invoiceId) => {
    const inv = invoicesRepository.getById(invoiceId);
    if (!inv) return `<div class="empty-state"><h3>Invoice not found</h3></div>`;

    const store = storesRepository.getById(inv.storeId);

    return `
      <!-- Toolbar -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem; max-width: 800px; margin-left: auto; margin-right: auto;">
        <button class="btn btn-secondary btn-sm" id="btn-back-to-invoices">← Back to Invoices</button>
        <div style="display:flex; gap:0.5rem;">
          ${inv.outstandingAmount > 0 && store && store.phone ? `
            <a href="https://wa.me/91${store.phone.replace(/\\D/g, '')}?text=${encodeURIComponent(`Hello ${store.contactPerson || store.name},\n\nThis is a friendly reminder from Kovai Dairy. Your invoice ${inv.invoiceNumber} has an outstanding balance of ₹${inv.outstandingAmount}. Please arrange payment at your earliest convenience.\n\nThank you!`)}" target="_blank" class="btn btn-secondary btn-sm" style="background: #DCF8C6; color: #075E54; border-color: #DCF8C6; font-weight: 600; text-decoration: none;">💬 WhatsApp Reminder</a>
          ` : ''}
          <button class="btn btn-secondary btn-sm" onclick="window.print();">🖨️ Print Invoice</button>
          ${inv.outstandingAmount > 0 ? `
            <button class="btn btn-primary btn-sm btn-record-payment-modal" data-invoice-id="${inv.id}">💳 Record Payment</button>
          ` : ''}
        </div>
      </div>

      <!-- Printable B2B Invoice Paper -->
      <div class="invoice-paper">
        <div class="invoice-header-row">
          <div class="company-brand">
            <h2>Kovai Dairy Distribution Co.</h2>
            <p>108 Trichy Road, Coimbatore, Tamil Nadu - 641018</p>
            <p>GSTIN: 33AAAAA0000A1Z5 • Support: +91 422 2300000</p>
          </div>
          <div class="invoice-meta">
            <h3>TAX INVOICE</h3>
            <p style="font-family: monospace; font-weight: 700; margin-top:0.25rem;">${inv.invoiceNumber}</p>
            <p style="font-size:0.85rem; color:var(--text-muted);">Date: ${inv.date}</p>
            <span class="badge badge-${inv.status.toLowerCase().replace(/\s+/g, '')}" style="margin-top:0.5rem;">${inv.status}</span>
          </div>
        </div>

        <div class="invoice-addresses">
          <div class="address-box">
            <h4>Billed To (Store):</h4>
            <p style="font-weight:700;">${inv.storeName}</p>
            <p>${store ? store.address : inv.location}</p>
            <p>Contact: ${store ? store.contactPerson : ''} (${store ? store.phone : ''})</p>
          </div>
          <div class="address-box" style="text-align:right;">
            <h4>Payment Terms & Status:</h4>
            <p>Due Date: Immediate / Net 7</p>
            <p style="font-weight:700; color:var(--accent-primary);">Grand Total: ${workflowEngine.formatCurrency(inv.grandTotal)}</p>
            <p style="color:${inv.outstandingAmount > 0 ? '#DC2626' : '#059669'}; font-weight:700;">Balance Due: ${workflowEngine.formatCurrency(inv.outstandingAmount)}</p>
          </div>
        </div>

        <!-- Items Table -->
        <table class="data-table" style="margin-bottom: 2rem;">
          <thead>
            <tr>
              <th>Item Description</th>
              <th style="text-align:center;">Qty</th>
              <th>Unit</th>
              <th style="text-align:right;">Rate</th>
              <th style="text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${inv.items.map(item => `
              <tr>
                <td style="font-weight:600;">${item.productName}</td>
                <td style="text-align:center; font-weight:700;">${item.quantity}</td>
                <td style="color:var(--text-muted);">${item.unit}</td>
                <td style="text-align:right;">₹${item.rate}</td>
                <td style="text-align:right; font-weight:700;">${workflowEngine.formatCurrency(item.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Totals -->
        <div style="display:flex; justify-content:flex-end;">
          <div style="width: 300px;" class="summary-box">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>${workflowEngine.formatCurrency(inv.subtotal)}</span>
            </div>
            <div class="summary-row">
              <span>Tax (GST):</span>
              <span>${workflowEngine.formatCurrency(inv.tax)}</span>
            </div>
            <div class="summary-row total">
              <span>Grand Total:</span>
              <span>${workflowEngine.formatCurrency(inv.grandTotal)}</span>
            </div>
            <div class="summary-row" style="margin-top:0.5rem; color:#059669; font-weight:600;">
              <span>Amount Paid:</span>
              <span>${workflowEngine.formatCurrency(inv.paidAmount)}</span>
            </div>
            <div class="summary-row" style="color:${inv.outstandingAmount > 0 ? '#DC2626' : '#059669'}; font-weight:700;">
              <span>Outstanding:</span>
              <span>${workflowEngine.formatCurrency(inv.outstandingAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
};
