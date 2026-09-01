import { workflowEngine } from '../services/workflowEngine.js';
import { storesRepository, productsRepository, requirementsRepository, invoicesRepository, paymentsRepository } from '../repositories/index.js';

export const dashboardView = {
  render: (currentDateStr) => {
    const kpis = workflowEngine.getDashboardKPIs(currentDateStr);
    const consolidated = workflowEngine.getConsolidatedRequirements(currentDateStr);
    const storeStatuses = workflowEngine.getStoreRequirementStatusList(currentDateStr);
    const invoices = invoicesRepository.getByDate(currentDateStr);

    const pendingStoresList = storeStatuses.filter(s => s.requirement.status === 'Pending');
    const progressPercent = Math.round((kpis.requirementsCollected / kpis.totalStoresCount) * 100) || 0;

    // Collect real user activity from Supabase repositories
    const activities = [];

    const stores = storesRepository.getAll();
    const products = productsRepository.getAll();
    const requirements = requirementsRepository.getAll();
    const allInvoices = invoicesRepository.getAll();
    const payments = paymentsRepository.getAll();

    stores.forEach(s => {
      activities.push({
        title: 'Store Registered',
        desc: `${s.name} (${s.code}) in ${s.location}.`,
        time: 'Store Record',
        iconBg: '#DBEAFE',
        iconColor: '#1E40AF',
        iconSvg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>`
      });
    });

    products.forEach(p => {
      activities.push({
        title: 'Product Added',
        desc: `${p.name} (${p.sku}) added at ₹${p.sellingPrice}.`,
        time: 'Catalog Item',
        iconBg: '#F3E8FF',
        iconColor: '#7C3AED',
        iconSvg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>`
      });
    });

    requirements.forEach(r => {
      activities.push({
        title: `Store Requirement ${r.status}`,
        desc: `${r.storeName} requirement of ${r.items.length} items (${workflowEngine.formatCurrency(r.totalAmount)}).`,
        time: r.date,
        iconBg: '#D1FAE5',
        iconColor: '#059669',
        iconSvg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`
      });
    });

    allInvoices.forEach(inv => {
      activities.push({
        title: `Invoice ${inv.invoiceNumber} Generated`,
        desc: `Invoice of ${workflowEngine.formatCurrency(inv.grandTotal)} generated for ${inv.storeName}.`,
        time: inv.date,
        iconBg: '#EFF6FF',
        iconColor: '#2563EB',
        iconSvg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>`
      });
    });

    payments.forEach(pay => {
      activities.push({
        title: 'Payment Received',
        desc: `${workflowEngine.formatCurrency(pay.amount)} received via ${pay.mode} from ${pay.storeName}.`,
        time: pay.date,
        iconBg: '#FEF3C7',
        iconColor: '#92400E',
        iconSvg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`
      });
    });

    return `
      <!-- Header Greeting & Date -->
      <div class="card-header" style="margin-bottom: 1.5rem;">
        <div>
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary);">Good morning, Admin 👋</h2>
          <p class="card-subtitle">Operational summary for ${currentDateStr}</p>
        </div>
      </div>

      <!-- Smart Missed Stores Alert Banner -->
      ${pendingStoresList.length > 0 ? `
        <div class="card" style="margin-bottom: 1.5rem; background: #FFFBEB; border: 1px solid #FCD34D;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
            <div style="display:flex; gap:0.75rem; align-items:center;">
              <div style="width:36px; height:36px; border-radius:50%; background:#FEF3C7; color:#D97706; display:flex; align-items:center; justify-content:center; font-weight:800;">⚠️</div>
              <div>
                <h4 style="font-weight:700; color:#92400E;">${pendingStoresList.length} Stores Missed Today's Order Submission</h4>
                <p style="font-size:0.85rem; color:#B45309;">Stores like <strong>${pendingStoresList.slice(0, 3).map(s => s.store.name).join(', ')}</strong> have not submitted daily requirements for ${currentDateStr} yet.</p>
              </div>
            </div>
            <div style="display:flex; gap:0.5rem;">
              <button class="btn btn-secondary btn-sm" id="btn-view-pending">View All Missed (${pendingStoresList.length})</button>
              <button class="btn btn-success btn-sm" id="btn-autofill-all-dashboard">⚡ Auto-Fill Yesterday's Orders</button>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Operational KPI Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Active Stores</span>
            <div class="kpi-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
            </div>
          </div>
          <div class="kpi-value">${kpis.totalStoresCount}</div>
          <div class="kpi-subtext">Registered distribution outlets</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Requirements Collected</span>
            <div class="kpi-icon" style="background:#D1FAE5; color:#059669;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          </div>
          <div class="kpi-value">${kpis.requirementsCollected} <span style="font-size: 1rem; color: var(--text-muted);">/ ${kpis.totalStoresCount}</span></div>
          <div class="kpi-subtext highlight">${kpis.requirementsPending} stores pending entry</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Today's Order Value</span>
            <div class="kpi-icon" style="background:#EFF6FF; color:#2563EB;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
          </div>
          <div class="kpi-value">${workflowEngine.formatCurrency(kpis.todayOrderValue)}</div>
          <div class="kpi-subtext">Confirmed requirements</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Today's Billing Value</span>
            <div class="kpi-icon" style="background:#F3E8FF; color:#7C3AED;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
            </div>
          </div>
          <div class="kpi-value">${workflowEngine.formatCurrency(kpis.todayBillingValue)}</div>
          <div class="kpi-subtext">${invoices.length} invoices generated</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Total Outstanding Payments</span>
            <div class="kpi-icon" style="background:#FEE2E2; color:#DC2626;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
          </div>
          <div class="kpi-value" style="color: #DC2626;">${workflowEngine.formatCurrency(kpis.totalOutstanding)}</div>
          <div class="kpi-subtext">Across all store accounts</div>
        </div>
      </div>

      <!-- Requirement Progress Banner -->
      <div class="card" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, #FFFFFF, #F8FAFC);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.75rem;">
          <div>
            <h3 style="font-size: 1rem; font-weight: 700;">Today's Requirement Progress</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted);">${kpis.requirementsCollected} of ${kpis.totalStoresCount} stores confirmed today</p>
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-view-pending">View Pending Stores (${kpis.requirementsPending})</button>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
        </div>
      </div>

      <!-- Main Dashboard Grid -->
      <div class="dashboard-grid">
        
        <!-- Left: Product Requirement Summary & Store Status -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          
          <!-- Consolidated Product Requirement Summary -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Product Requirement Summary</h3>
                <p class="card-subtitle">Consolidated daily demand from confirmed stores</p>
              </div>
              <button class="btn btn-primary btn-sm" id="btn-create-po">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                Create Purchase Order
              </button>
            </div>

            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th style="text-align:right;">Required</th>
                    <th>Unit</th>
                    <th style="text-align:right;">Purchase Price</th>
                    <th style="text-align:right;">Est. Cost</th>
                  </tr>
                </thead>
                <tbody>
                  ${consolidated.length > 0 ? consolidated.map(item => `
                    <tr>
                      <td style="font-weight: 600;">${item.product.name}</td>
                      <td><span class="badge badge-draft">${item.product.category}</span></td>
                      <td style="text-align:right; font-weight: 700; color: var(--accent-primary);">${item.totalRequired}</td>
                      <td style="color: var(--text-muted);">${item.unit}</td>
                      <td style="text-align:right;">₹${item.purchasePrice}</td>
                      <td style="text-align:right; font-weight: 600;">${workflowEngine.formatCurrency(item.estimatedCost)}</td>
                    </tr>
                  `).join('') : `
                    <tr>
                      <td colspan="6">
                        <div class="empty-state" style="padding:1.75rem 1rem;">
                          <div class="empty-state-icon" style="width:44px; height:44px; margin-bottom:0.6rem;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px; height:22px;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
                          </div>
                          <h4>No products or requirements confirmed for today</h4>
                          <p style="margin-bottom:0.75rem;">Add products to your catalog to track daily procurement requirements.</p>
                          <button class="btn btn-primary btn-sm" id="btn-add-product">+ Add Product</button>
                        </div>
                      </td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Store Status Table -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Store Requirement Status</h3>
                <p class="card-subtitle">Store-wise today's requirement status</p>
              </div>
            </div>

            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Store</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th style="text-align:right;">Bill Amount</th>
                    <th style="text-align:right;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${storeStatuses.length > 0 ? storeStatuses.slice(0, 8).map(s => `
                    <tr>
                      <td>
                        <div style="font-weight:600;">${s.store.name}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted);">${s.store.code}</div>
                      </td>
                      <td>${s.store.location}</td>
                      <td>
                        <span class="badge badge-${s.requirement.status.toLowerCase()}">${s.requirement.status}</span>
                      </td>
                      <td style="text-align:right; font-weight: 600;">${workflowEngine.formatCurrency(s.requirement.totalAmount)}</td>
                      <td style="text-align:right;">
                        <button class="btn btn-secondary btn-sm btn-enter-req" data-store-id="${s.store.id}">
                          ${s.requirement.status === 'Confirmed' ? 'View/Edit' : 'Enter Req'}
                        </button>
                      </td>
                    </tr>
                  `).join('') : `
                    <tr>
                      <td colspan="5">
                        <div class="empty-state" style="padding:1.75rem 1rem;">
                          <div class="empty-state-icon" style="width:44px; height:44px; margin-bottom:0.6rem;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px; height:22px;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
                          </div>
                          <h4>No stores registered yet</h4>
                          <p style="margin-bottom:0.75rem;">Add retail stores to track daily requirements on your dashboard.</p>
                          <button class="btn btn-primary btn-sm" id="btn-add-store">+ Add Store</button>
                        </div>
                      </td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        <!-- Right: Recent Activity Stream -->
        <div>
          <div class="card" style="position: sticky; top: 90px;">
            <div class="card-header">
              <h3 class="card-title">Recent Activity</h3>
            </div>
            
            <div class="activity-list">
              ${activities.length > 0 ? activities.slice(0, 8).map(act => `
                <div class="activity-item">
                  <div class="activity-icon" style="background:${act.iconBg}; color:${act.iconColor};">
                    ${act.iconSvg}
                  </div>
                  <div class="activity-content">
                    <div class="activity-title">${act.title}</div>
                    <div style="color:var(--text-secondary);">${act.desc}</div>
                    <div class="activity-time">${act.time}</div>
                  </div>
                </div>
              `).join('') : `
                <div class="empty-state" style="padding: 1.75rem 1rem;">
                  <div class="empty-state-icon" style="width:44px; height:44px; margin-bottom:0.6rem;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px; height:22px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  </div>
                  <h4>No activity recorded yet</h4>
                  <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0;">Add stores, products, or record daily requirements to see real-time updates here.</p>
                </div>
              `}
            </div>
          </div>
        </div>

      </div>
    `;
  }
};
