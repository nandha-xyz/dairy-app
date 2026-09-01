import { workflowEngine } from '../services/workflowEngine.js';

export const requirementsView = {
  render: (currentDateStr, statusFilter = 'All', locationFilter = 'All') => {
    let storesReqs = workflowEngine.getStoreRequirementStatusList(currentDateStr);

    if (statusFilter !== 'All') {
      storesReqs = storesReqs.filter(s => s.requirement.status === statusFilter);
    }
    if (locationFilter !== 'All') {
      storesReqs = storesReqs.filter(s => s.store.location === locationFilter);
    }

    const kpis = workflowEngine.getDashboardKPIs(currentDateStr);

    return `
      <!-- Top Summary Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Total Stores</div>
          <div class="kpi-value">${kpis.totalStoresCount}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Confirmed</div>
          <div class="kpi-value" style="color: #059669;">${kpis.requirementsCollected}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Pending</div>
          <div class="kpi-value" style="color: #D97706;">${kpis.requirementsPending}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Billing Value</div>
          <div class="kpi-value" style="color: var(--accent-primary);">${workflowEngine.formatCurrency(kpis.todayBillingValue)}</div>
        </div>
      </div>

      <!-- Filter Controls Toolbar -->
      <div class="filter-toolbar">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" id="req-search-input" class="form-input" placeholder="Search store name, code, or contact..." />
        </div>

        <div style="display:flex; gap:0.5rem; align-items:center;">
          <label class="form-label" style="margin:0;">Location:</label>
          <select id="req-location-filter" class="form-select">
            <option value="All" ${locationFilter === 'All' ? 'selected' : ''}>All Locations</option>
            <option value="Coimbatore" ${locationFilter === 'Coimbatore' ? 'selected' : ''}>Coimbatore</option>
            <option value="Pollachi" ${locationFilter === 'Pollachi' ? 'selected' : ''}>Pollachi</option>
            <option value="Tiruppur" ${locationFilter === 'Tiruppur' ? 'selected' : ''}>Tiruppur</option>
            <option value="Erode" ${locationFilter === 'Erode' ? 'selected' : ''}>Erode</option>
          </select>
        </div>

        <div style="display:flex; gap:0.5rem; align-items:center;">
          <label class="form-label" style="margin:0;">Status:</label>
          <select id="req-status-filter" class="form-select">
            <option value="All" ${statusFilter === 'All' ? 'selected' : ''}>All Statuses</option>
            <option value="Pending" ${statusFilter === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Draft" ${statusFilter === 'Draft' ? 'selected' : ''}>Draft</option>
            <option value="Confirmed" ${statusFilter === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
          </select>
        </div>
      </div>

      <!-- Store Requirements Table -->
      <div class="card">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Store Code</th>
                <th>Store Name</th>
                <th>Location</th>
                <th>Status</th>
                <th style="text-align:right;">Items Count</th>
                <th style="text-align:right;">Bill Amount</th>
                <th>Last Updated</th>
                <th style="text-align:right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${storesReqs.length > 0 ? storesReqs.map(s => {
                const activeItemsCount = s.requirement.items.filter(i => i.quantity > 0).length;
                return `
                  <tr>
                    <td style="font-family: monospace; font-weight: 600;">${s.store.code}</td>
                    <td style="font-weight:600; color:var(--accent-primary);">${s.store.name}</td>
                    <td>${s.store.location}</td>
                    <td>
                      <span class="badge badge-${s.requirement.status.toLowerCase()}">${s.requirement.status}</span>
                    </td>
                    <td style="text-align:right; font-weight:600;">${activeItemsCount} items</td>
                    <td style="text-align:right; font-weight: 700;">${workflowEngine.formatCurrency(s.requirement.totalAmount)}</td>
                    <td style="color:var(--text-muted); font-size:0.8rem;">${s.requirement.lastUpdated}</td>
                    <td style="text-align:right;">
                      <button class="btn btn-primary btn-sm btn-enter-req" data-store-id="${s.store.id}">
                        ${s.requirement.status === 'Confirmed' ? 'View/Edit' : 'Enter Requirement'}
                      </button>
                    </td>
                  </tr>
                `;
              }).join('') : `
                <tr>
                  <td colspan="8">
                    <div class="empty-state">
                      <div class="empty-state-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                      </div>
                      <h3>No daily requirements recorded</h3>
                      <p>Select a store to log today's order requirement quantities or add new retail stores.</p>
                      <button class="btn btn-primary" id="btn-add-store">+ Add Store</button>
                    </div>
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
};
