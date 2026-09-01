import { storesRepository, productsRepository, invoicesRepository, paymentsRepository } from '../repositories/index.js';

export const settingsView = {
  render: () => {
    const storesCount = storesRepository.getAll().length;
    const productsCount = productsRepository.getAll().length;
    const invoicesCount = invoicesRepository.getAll().length;
    const paymentsCount = paymentsRepository.getAll().length;

    return `
      <div style="margin-bottom: 1.5rem;">
        <h2 style="font-size: 1.4rem; font-weight: 800;">Application Settings</h2>
        <p style="font-size: 0.85rem; color: var(--text-muted);">Manage business profile and export application data</p>
      </div>

      <div style="display:flex; flex-direction:column; gap:1.5rem; max-width: 720px;">
        
        <!-- Data Export Section -->
        <div class="card">
          <div class="card-header" style="margin-bottom: 1rem;">
            <div>
              <h3 class="card-title">Export Application Data</h3>
              <p class="card-subtitle">Download your active cloud data in JSON backup or CSV spreadsheet formats.</p>
            </div>
          </div>

          <!-- Full Backup Option -->
          <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.25rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
              <div>
                <h4 style="font-weight:700; font-size:1rem; margin-bottom:0.25rem;">Download Full Backup (JSON)</h4>
                <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">Includes stores (${storesCount}), products (${productsCount}), invoices (${invoicesCount}), payments (${paymentsCount}), and settings.</p>
              </div>
              <button class="btn btn-primary" id="btn-export-json">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Download Full Backup (.json)
              </button>
            </div>
          </div>

          <!-- CSV Exports Grid -->
          <h4 style="font-size:0.9rem; font-weight:700; color:var(--text-secondary); margin-bottom:0.75rem;">Export Specific Datasets (CSV)</h4>
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:0.75rem;">
            
            <button class="btn btn-secondary" id="btn-export-stores-csv" style="justify-content:flex-start; padding:0.75rem 1rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
              <span>Export Stores CSV (${storesCount})</span>
            </button>

            <button class="btn btn-secondary" id="btn-export-products-csv" style="justify-content:flex-start; padding:0.75rem 1rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
              <span>Export Products CSV (${productsCount})</span>
            </button>

            <button class="btn btn-secondary" id="btn-export-invoices-csv" style="justify-content:flex-start; padding:0.75rem 1rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
              <span>Export Invoices CSV (${invoicesCount})</span>
            </button>

            <button class="btn btn-secondary" id="btn-export-payments-csv" style="justify-content:flex-start; padding:0.75rem 1rem;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
              <span>Export Payments CSV (${paymentsCount})</span>
            </button>

          </div>
        </div>

        <!-- Business Profile -->
        <div class="card">
          <h3 class="card-title" style="margin-bottom: 1rem;">Business Profile</h3>
          <div class="form-group">
            <label class="form-label">Business Name</label>
            <input type="text" class="form-input" value="Kovai Dairy Distribution Co." />
          </div>
          <div class="form-group">
            <label class="form-label">Operating Region</label>
            <input type="text" class="form-input" value="Tamil Nadu (Coimbatore, Pollachi, Tiruppur, Erode)" readonly />
          </div>
        </div>

      </div>
    `;
  }
};
