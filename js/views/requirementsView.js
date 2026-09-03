import { workflowEngine } from '../services/workflowEngine.js';
import { productsRepository } from '../repositories/index.js';

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
    const activeProducts = productsRepository.getActive();

    // Excel-style grid styling embedded for simplicity
    const tableStyle = `
      <style>
        .excel-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
          white-space: nowrap;
        }
        .excel-table th, .excel-table td {
          border: 1px solid #E2E8F0;
          padding: 0.4rem 0.5rem;
        }
        .excel-table th {
          background: #F8FAFC;
          position: sticky;
          top: 0;
          z-index: 10;
          font-weight: 700;
          color: #334155;
          text-align: center;
        }
        .excel-table th.store-col {
          left: 0;
          z-index: 20;
          text-align: left;
          min-width: 180px;
        }
        .excel-table td.store-col {
          position: sticky;
          left: 0;
          background: white;
          z-index: 5;
          font-weight: 600;
          color: #0F172A;
          box-shadow: 2px 0 5px rgba(0,0,0,0.02);
        }
        .grid-input {
          width: 55px;
          border: 1px solid transparent;
          border-radius: 4px;
          padding: 0.3rem 0.2rem;
          text-align: center;
          font-size: 0.9rem;
          font-weight: 600;
          color: #1E293B;
          transition: all 0.2s;
        }
        .grid-input:hover {
          border-color: #CBD5E1;
        }
        .grid-input:focus {
          border-color: #2563EB;
          outline: none;
          box-shadow: 0 0 0 2px rgba(37,99,235,0.2);
          background: #EFF6FF;
        }
        /* Remove arrows from number input */
        .grid-input::-webkit-outer-spin-button,
        .grid-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .grid-input[type=number] {
          -moz-appearance: textfield;
        }
      </style>
    `;

    return `
      ${tableStyle}
      
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

      <!-- Excel-Style Requirements Grid -->
      <div class="card" style="padding: 0; overflow-x: auto; max-height: 65vh;">
        <table class="excel-table" id="requirements-grid">
          <thead>
            <tr>
              <th class="store-col">Store Details</th>
              ${activeProducts.map(p => `
                <th title="${p.name} (₹${p.sellingPrice})">
                  <div style="font-size: 0.75rem;">${p.name.substring(0, 15)}</div>
                  <div style="font-size: 0.65rem; font-weight: normal; color: #64748B;">₹${p.sellingPrice}</div>
                </th>
              `).join('')}
              <th style="min-width: 100px;">Total Bill</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${storesReqs.length > 0 ? storesReqs.map(s => {
              return `
                <tr data-store-id="${s.store.id}">
                  <td class="store-col">
                    <div style="display:flex; flex-direction:column;">
                      <span style="color: var(--accent-primary); font-size: 0.9rem;">${s.store.name}</span>
                      <span style="font-size:0.7rem; color:#64748B; font-weight:normal;">${s.store.code} | ${s.store.location}</span>
                    </div>
                  </td>
                  
                  ${activeProducts.map(product => {
                    const reqItem = s.requirement.items.find(i => i.productId === product.id);
                    const qty = reqItem ? reqItem.quantity : '';
                    const actualPrice = (s.store.customPrices && s.store.customPrices[product.id]) ? s.store.customPrices[product.id] : product.sellingPrice;
                    const priceIndicator = (s.store.customPrices && s.store.customPrices[product.id]) ? 'border-bottom: 2px solid #2563EB;' : '';
                    return `
                      <td style="text-align: center; ${priceIndicator}" title="Price: ₹${actualPrice}">
                        <input type="number" 
                               class="grid-input req-qty-input" 
                               data-store-id="${s.store.id}" 
                               data-product-id="${product.id}" 
                               data-price="${actualPrice}"
                               data-tax="${product.taxPercent}"
                               value="${qty || ''}" 
                               min="0" />
                      </td>
                    `;
                  }).join('')}
                  
                  <td style="text-align: right; font-weight: 800; color: #0F172A; font-size: 0.95rem;" id="total-${s.store.id}">
                    ${workflowEngine.formatCurrency(s.requirement.totalAmount)}
                  </td>
                  <td style="text-align: center;">
                    <select class="req-status-select form-select" data-store-id="${s.store.id}" style="padding: 0.2rem 1.5rem 0.2rem 0.5rem; font-size: 0.8rem; height: auto; min-width: 110px;">
                      <option value="Pending" ${s.requirement.status === 'Pending' ? 'selected' : ''}>Pending</option>
                      <option value="Draft" ${s.requirement.status === 'Draft' ? 'selected' : ''}>Draft</option>
                      <option value="Confirmed" ${s.requirement.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                    </select>
                  </td>
                </tr>
              `;
            }).join('') : `<tr><td colspan="${activeProducts.length + 3}" style="text-align:center; padding: 3rem; color: #64748B;">No stores match the current filters.</td></tr>`}
          </tbody>
        </table>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.75rem;">
        <span style="font-size:0.75rem; color:var(--text-muted);">
          * Changes are saved automatically. Use Tab or Arrow keys to navigate between products.
        </span>
      </div>
    `;
  }
};
