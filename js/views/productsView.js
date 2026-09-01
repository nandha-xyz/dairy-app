import { productsRepository } from '../repositories/index.js';

export const productsView = {
  render: () => {
    const products = productsRepository.getAll();

    return `
      <!-- Top Action Toolbar -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1.5rem;">
        <div>
          <h2 style="font-size: 1.4rem; font-weight: 800;">Product Catalog</h2>
          <p style="font-size: 0.85rem; color: var(--text-muted);">${products.length} configurable dairy products</p>
        </div>
        <button class="btn btn-primary" id="btn-add-product">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Add Product
        </button>
      </div>

      <!-- Products Grid/Table -->
      <div class="card">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Unit</th>
                <th style="text-align:right;">Selling Price</th>
                <th style="text-align:right;">Purchase Price</th>
                <th style="text-align:right;">Tax (GST)</th>
                <th>Status</th>
                <th style="text-align:right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${products.map(p => `
                <tr>
                  <td style="font-family: monospace; font-weight: 600;">${p.sku}</td>
                  <td style="font-weight: 700; color: var(--text-primary);">${p.name}</td>
                  <td><span class="badge badge-draft">${p.category}</span></td>
                  <td style="color: var(--text-muted);">${p.unit}</td>
                  <td style="text-align:right; font-weight: 700; color: var(--accent-primary);">₹${p.sellingPrice}</td>
                  <td style="text-align:right;">₹${p.purchasePrice}</td>
                  <td style="text-align:right;">${p.taxPercent}%</td>
                  <td>
                    <span class="badge ${p.active ? 'badge-confirmed' : 'badge-draft'}">${p.active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td style="text-align:right;">
                    <button class="btn btn-secondary btn-sm btn-edit-product" data-product-id="${p.id}">Edit</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
};
