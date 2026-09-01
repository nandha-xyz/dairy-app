import { invoicesRepository, productsRepository, storesRepository, paymentsRepository } from '../repositories/index.js';
import { workflowEngine } from '../services/workflowEngine.js';

export const reportsView = {
  render: () => {
    const invoices = invoicesRepository.getAll();
    const products = productsRepository.getAll();
    const stores = storesRepository.getAll();
    const payments = paymentsRepository.getAll();

    const totalRevenue = invoices.reduce((s, i) => s + i.grandTotal, 0);
    const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
    const avgOrderVal = Math.round(totalRevenue / (invoices.length || 1));

    // Calculate product sales summary
    const productStats = products.map(p => {
      let totalQty = 0;
      let rev = 0;
      invoices.forEach(inv => {
        inv.items.forEach(item => {
          if (item.productId === p.id) {
            totalQty += item.quantity;
            rev += item.amount;
          }
        });
      });
      return { product: p, totalQty, revenue: rev };
    });

    return `
      <!-- Header -->
      <div style="margin-bottom: 1.5rem;">
        <h2 style="font-size: 1.4rem; font-weight: 800;">Analytics & Business Reports</h2>
        <p style="font-size: 0.85rem; color: var(--text-muted);">Distribution metrics and demand trends</p>
      </div>

      <!-- Report Summary KPIs -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Total Invoiced Revenue</div>
          <div class="kpi-value" style="color:var(--accent-primary);">${workflowEngine.formatCurrency(totalRevenue)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Payment Collection</div>
          <div class="kpi-value" style="color:#059669;">${workflowEngine.formatCurrency(totalCollected)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Invoices Issued</div>
          <div class="kpi-value">${invoices.length}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Average Invoice Value</div>
          <div class="kpi-value">${workflowEngine.formatCurrency(avgOrderVal)}</div>
        </div>
      </div>

      <!-- Product Demand Distribution Table -->
      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="card-header">
          <h3 class="card-title">Product Demand & Revenue Breakdown</h3>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th style="text-align:right;">Total Volume Sold</th>
                <th>Unit</th>
                <th style="text-align:right;">Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${productStats.length > 0 ? productStats.map(ps => `
                <tr>
                  <td style="font-weight:700;">${ps.product.name}</td>
                  <td><span class="badge badge-draft">${ps.product.category}</span></td>
                  <td style="text-align:right; font-weight:700; color:var(--accent-primary);">${ps.totalQty}</td>
                  <td style="color:var(--text-muted);">${ps.product.unit}</td>
                  <td style="text-align:right; font-weight:700;">${workflowEngine.formatCurrency(ps.revenue)}</td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="5">
                    <div class="empty-state">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                      <h3>No analytics data available</h3>
                      <p>Add products to your catalog and start generating invoices to view demand trends.</p>
                    </div>
                  </td>
                </tr>
              `}
            </tbody>
          </table>
    `;
  }
};
