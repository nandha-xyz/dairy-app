import { storesRepository, invoicesRepository, requirementsRepository, paymentsRepository, productsRepository } from '../repositories/index.js';
import { workflowEngine } from '../services/workflowEngine.js';

export const storesView = {
  renderList: (locationFilter = 'All', statusFilter = 'All') => {
    let stores = storesRepository.getAll();

    if (locationFilter !== 'All') {
      stores = stores.filter(s => s.location === locationFilter);
    }
    if (statusFilter !== 'All') {
      stores = stores.filter(s => s.status === statusFilter);
    }

    return `
      <!-- Header Toolbar -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem;">
        <div>
          <h2 style="font-size: 1.4rem; font-weight: 800;">Stores Directory</h2>
          <p style="font-size: 0.85rem; color: var(--text-muted);">${stores.length} distribution outlets registered</p>
        </div>
        <button class="btn btn-primary" id="btn-add-store">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Add Store
        </button>
      </div>

      <!-- Filters -->
      <div class="filter-toolbar">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" id="store-search-input" class="form-input" placeholder="Search store name, contact, code..." />
        </div>

        <select id="store-location-filter" class="form-select">
          <option value="All" ${locationFilter === 'All' ? 'selected' : ''}>All Locations</option>
          <option value="Coimbatore" ${locationFilter === 'Coimbatore' ? 'selected' : ''}>Coimbatore</option>
          <option value="Pollachi" ${locationFilter === 'Pollachi' ? 'selected' : ''}>Pollachi</option>
          <option value="Tiruppur" ${locationFilter === 'Tiruppur' ? 'selected' : ''}>Tiruppur</option>
          <option value="Erode" ${locationFilter === 'Erode' ? 'selected' : ''}>Erode</option>
        </select>
      </div>

      <!-- Stores Table -->
      <div class="card">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Store Name</th>
                <th>Location</th>
                <th>Contact</th>
                <th style="text-align:right;">Outstanding</th>
                <th>Status</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${stores.length > 0 ? stores.map(store => {
                const outstanding = workflowEngine.getStoreOutstandingBalance(store.id);
                return `
                  <tr>
                    <td style="font-family: monospace; font-weight: 600;">${store.code}</td>
                    <td>
                      <a href="#" class="btn-view-store-detail" data-store-id="${store.id}" style="font-weight:700; color:var(--accent-primary); text-decoration:none;">
                        ${store.name}
                      </a>
                    </td>
                    <td>${store.location}</td>
                    <td>
                      <div style="font-weight:500;">${store.contactPerson}</div>
                      <div style="font-size:0.75rem; color:var(--text-muted);">${store.phone}</div>
                    </td>
                    <td style="text-align:right; font-weight:700; color: ${outstanding > 0 ? '#DC2626' : '#059669'};">
                      ${workflowEngine.formatCurrency(outstanding)}
                    </td>
                    <td>
                      <span class="badge badge-confirmed">${store.status}</span>
                    </td>
                    <td style="text-align:right;">
                      <button class="btn btn-secondary btn-sm btn-view-store-detail" data-store-id="${store.id}">View</button>
                      <button class="btn btn-primary btn-sm btn-enter-req" data-store-id="${store.id}">Req</button>
                    </td>
                  </tr>
                `;
              }).join('') : `
                <tr>
                  <td colspan="7">
                    <div class="empty-state">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
                      <h3>No stores found</h3>
                      <p>Click "Add Store" to add your first distribution store.</p>
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

  renderDetail: (storeId, activeTab = 'overview') => {
    const store = storesRepository.getById(storeId);
    if (!store) return `<div class="empty-state"><h3>Store not found</h3></div>`;

    const outstanding = workflowEngine.getStoreOutstandingBalance(storeId);
    const reqs = requirementsRepository.getByStore(storeId);
    const invs = invoicesRepository.getByStore(storeId);
    const pays = paymentsRepository.getByStore(storeId);

    const avgDailyBill = Math.round(reqs.reduce((s, r) => s + r.totalAmount, 0) / (reqs.length || 1));

    return `
      <!-- Store Header Card -->
      <div class="card" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, #FFFFFF, #F1F5F9);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <h2 style="font-size: 1.6rem; font-weight: 800;">${store.name}</h2>
              <span class="badge badge-confirmed">${store.status}</span>
            </div>
            <p style="color:var(--text-muted); margin-top: 0.25rem;">
              ${store.code} • ${store.location} • ${store.contactPerson} (${store.phone})
            </p>
            <p style="font-size:0.85rem; color:var(--text-secondary); margin-top: 0.25rem;">📍 ${store.address}</p>
          </div>
          <div style="text-align:right; background:white; padding:1rem 1.5rem; border-radius:var(--radius-md); border:1px solid var(--border-color);">
            <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Outstanding Balance</div>
            <div style="font-size:1.8rem; font-weight:800; color:${outstanding > 0 ? '#DC2626' : '#059669'};">${workflowEngine.formatCurrency(outstanding)}</div>
          </div>
        </div>
      </div>

      <!-- Detail Tabs Navigation -->
      <div class="tabs-header">
        <button class="tab-btn ${activeTab === 'overview' ? 'active' : ''}" data-tab="overview" data-store-id="${storeId}">Overview</button>
        <button class="tab-btn ${activeTab === 'requirements' ? 'active' : ''}" data-tab="requirements" data-store-id="${storeId}">Requirements (${reqs.length})</button>
        <button class="tab-btn ${activeTab === 'invoices' ? 'active' : ''}" data-tab="invoices" data-store-id="${storeId}">Invoices (${invs.length})</button>
        <button class="tab-btn ${activeTab === 'payments' ? 'active' : ''}" data-tab="payments" data-store-id="${storeId}">Payments (${pays.length})</button>
      </div>

      <!-- Tab Content Area -->
      <div class="tab-content">
        ${activeTab === 'overview' ? `
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-label">Average Daily Order</div>
              <div class="kpi-value">${workflowEngine.formatCurrency(avgDailyBill)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Total Invoices</div>
              <div class="kpi-value">${invs.length}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Total Paid</div>
              <div class="kpi-value" style="color:#059669;">${workflowEngine.formatCurrency(pays.reduce((s, p) => s + p.amount, 0))}</div>
            </div>
          </div>

          <div class="card" style="margin-top: 1.5rem;">
            <h3 class="card-title" style="margin-bottom: 1rem;">Frequent Product Demand (Recurring Order Profile)</h3>
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style="text-align:right;">Default Daily Qty</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.keys(store.recurringRequirements || {}).length > 0 ? Object.entries(store.recurringRequirements).map(([pid, qty]) => {
                    const prod = productsRepository.getById(pid);
                    return `
                      <tr>
                        <td style="font-weight:600;">
                          ${prod ? prod.name : pid}
                          <div style="font-size:0.75rem; color:var(--text-muted);">${prod ? prod.sku : ''}</div>
                        </td>
                        <td style="text-align:right; font-weight:700; color:var(--accent-primary);">${qty} ${prod ? prod.unit : ''}</td>
                      </tr>
                    `;
                  }).join('') : `<tr><td colspan="2" style="text-align:center; color:var(--text-muted);">No recurring products set yet.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        ` : activeTab === 'requirements' ? `
          <div class="card">
            <h3 class="card-title" style="margin-bottom: 1rem;">Itemized Daily Requirement History</h3>
            <div style="display:flex; flex-direction:column; gap:1rem;">
              ${reqs.length > 0 ? reqs.map(req => `
                <div style="border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1rem; background:white;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; border-bottom:1px dashed var(--border-color); padding-bottom:0.5rem;">
                    <div>
                      <span style="font-weight:800; font-size:0.95rem;">📅 Order Date: ${req.date}</span>
                      <span class="badge badge-${req.status.toLowerCase()}" style="margin-left:0.5rem;">${req.status}</span>
                    </div>
                    <div style="font-weight:800; color:var(--accent-primary); font-size:1.05rem;">
                      ${workflowEngine.formatCurrency(req.totalAmount)}
                    </div>
                  </div>
                  <div class="table-container">
                    <table class="data-table" style="font-size:0.82rem;">
                      <thead>
                        <tr>
                          <th>Item Purchased</th>
                          <th style="text-align:center;">Quantity</th>
                          <th style="text-align:right;">Rate</th>
                          <th style="text-align:right;">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${(req.items || []).map(item => `
                          <tr>
                            <td style="font-weight:600;">${item.productName}</td>
                            <td style="text-align:center; font-weight:700;">${item.quantity} ${item.unit}</td>
                            <td style="text-align:right;">₹${item.rate}</td>
                            <td style="text-align:right; font-weight:600;">${workflowEngine.formatCurrency(item.amount)}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              `).join('') : `<p style="color:var(--text-muted);">No requirement records found for this store.</p>`}
            </div>
          </div>
        ` : activeTab === 'invoices' ? `
          <div class="card">
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th style="text-align:right;">Grand Total</th>
                    <th style="text-align:right;">Paid</th>
                    <th style="text-align:right;">Outstanding</th>
                    <th>Status</th>
                    <th style="text-align:right;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${invs.map(inv => `
                    <tr>
                      <td style="font-weight:700; font-family:monospace;">${inv.invoiceNumber}</td>
                      <td>${inv.date}</td>
                      <td style="text-align:right; font-weight:600;">${workflowEngine.formatCurrency(inv.grandTotal)}</td>
                      <td style="text-align:right; color:#059669;">${workflowEngine.formatCurrency(inv.paidAmount)}</td>
                      <td style="text-align:right; font-weight:700; color:${inv.outstandingAmount > 0 ? '#DC2626' : '#059669'};">${workflowEngine.formatCurrency(inv.outstandingAmount)}</td>
                      <td><span class="badge badge-${inv.status.toLowerCase().replace(' ', '')}">${inv.status}</span></td>
                      <td style="text-align:right;">
                        <button class="btn btn-secondary btn-sm btn-view-invoice" data-invoice-id="${inv.id}">View Invoice</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : `
          <div class="card">
            <h3 class="card-title" style="margin-bottom: 1rem;">Payment Audit Trail</h3>
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Receipt #</th>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th style="text-align:right;">Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  ${pays.length > 0 ? pays.map(pay => `
                    <tr>
                      <td style="font-weight:700; font-family:monospace;">${pay.id}</td>
                      <td>${pay.date}</td>
                      <td><span class="badge badge-draft">${pay.method}</span></td>
                      <td style="color:var(--text-muted);">${pay.referenceNumber || 'N/A'}</td>
                      <td style="text-align:right; font-weight:700; color:#059669;">${workflowEngine.formatCurrency(pay.amount)}</td>
                    </tr>
                  `).join('') : `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No payments recorded yet.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        `}
      </div>
    `;
  }
};
