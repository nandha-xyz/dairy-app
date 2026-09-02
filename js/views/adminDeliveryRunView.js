import { storesRepository, deliveryRunsRepository } from '../repositories/index.js';
import { workflowEngine } from '../services/workflowEngine.js';

export const adminDeliveryRunView = {
  render(selectedDate = workflowEngine.getTodayString()) {
    const stores = storesRepository.getAll();
    const runs = deliveryRunsRepository.getByDate(selectedDate);

    return `
      <div style="max-width: 1000px; margin: 0 auto; padding: 0.5rem 0;">
        
        <!-- Top Title Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-main); margin: 0;">🚛 Driver Delivery Dispatcher</h2>
            <p style="font-size: 0.875rem; color: var(--text-muted); margin: 0.25rem 0 0 0;">
              Assign drivers to daily delivery runs, sequence stops, and generate driver manifests for ${selectedDate}
            </p>
          </div>

          <button id="btn-create-delivery-run" class="btn btn-primary" style="display: flex; align-items: center; gap: 0.5rem;">
            <span>➕ Dispatch New Delivery Run</span>
          </button>
        </div>

        <!-- Active Runs Table / Grid -->
        ${runs.length === 0 ? `
          <div class="empty-state" style="padding: 3rem 1.5rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
            <div class="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2" ry="2"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
            </div>
            <h3>No delivery runs created for ${selectedDate}</h3>
            <p>Click "Dispatch New Delivery Run" above to assign stores and products to a driver for today.</p>
          </div>
        ` : `
          <div style="display: grid; grid-template-columns: 1fr; gap: 1.25rem;">
            ${runs.map(run => {
              const stops = run.stops || [];
              const totalItemsCount = stops.reduce((acc, stop) => acc + (stop.items ? stop.items.reduce((iAcc, item) => iAcc + item.quantity, 0) : 0), 0);
              const completedStops = stops.filter(s => s.status === 'Delivered').length;

              return `
                <div class="card" style="border-left: 6px solid ${run.status === 'Completed' ? '#10B981' : run.status === 'In Progress' ? '#3B82F6' : '#64748B'};">
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem; border-bottom: 1px solid #F1F5F9; padding-bottom: 0.75rem;">
                    <div>
                      <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-weight: 800; font-size: 1.1rem; color: var(--text-main);">Run #${run.id}</span>
                        <span class="badge ${run.status === 'Completed' ? 'badge-delivered' : 'badge-pending'}">${run.status}</span>
                      </div>
                      <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
                        Driver User ID: <strong style="font-family: monospace; color: #2563EB;">${run.driver_id}</strong>
                      </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 1.5rem;">
                      <div style="text-align: right;">
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Progress</div>
                        <div style="font-weight: 700; font-size: 0.95rem; color: #1E293B;">${completedStops} / ${stops.length} Stops Delivered</div>
                      </div>
                      <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-secondary btn-sm btn-print-challan" data-run-id="${run.id}" style="color: #4F46E5; border-color: #C7D2FE;">
                          🖨️ Print Challan
                        </button>
                        <button class="btn btn-secondary btn-sm btn-delete-delivery-run" data-run-id="${run.id}" style="color: #DC2626; border-color: #FCA5A5;">
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Stops Detail Table -->
                  <div class="table-container">
                    <table class="data-table" style="font-size: 0.85rem;">
                      <thead>
                        <tr>
                          <th style="width: 50px;">Seq</th>
                          <th>Store Name</th>
                          <th>Location / Address</th>
                          <th>Items to Deliver</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${stops.map(stop => `
                          <tr>
                            <td><span style="display: inline-block; width: 24px; height: 24px; border-radius: 50%; background: #EFF6FF; text-align: center; line-height: 24px; font-weight: 800; color: #2563EB;">${stop.sequence}</span></td>
                            <td style="font-weight: 700; color: #0F172A;">${stop.store_name}</td>
                            <td style="color: var(--text-muted);">${stop.address || stop.location || '-'}</td>
                            <td>
                              ${(stop.items || []).map(i => `<span style="display: inline-block; background: #F1F5F9; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.75rem; margin-right: 0.3rem;">${i.product_name}: <strong>${i.quantity} ${i.unit}</strong></span>`).join('')}
                            </td>
                            <td>
                              <span class="badge ${stop.status === 'Delivered' ? 'badge-delivered' : 'badge-pending'}">
                                ${stop.status || 'Pending'}
                              </span>
                            </td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  },

  renderCreateModal(dateStr = workflowEngine.getTodayString()) {
    const stores = storesRepository.getAll();

    return `
      <div class="modal-card" style="max-width: 650px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-color);">
          <h3 style="font-size: 1.2rem; font-weight: 800; margin: 0;">🚛 Dispatch New Driver Delivery Run</h3>
          <button type="button" id="btn-cancel-modal" class="btn btn-secondary btn-sm" style="padding: 0.25rem 0.5rem;">✕</button>
        </div>

        <form id="form-create-delivery-run">
          <div class="form-group">
            <label class="form-label">Driver Supabase User ID (UUID)</label>
            <input type="text" name="driverId" class="form-input" required placeholder="e.g. 8f14a520-4109-42b7-87e3-98218171092a" />
            <small style="color: var(--text-muted); font-size: 0.75rem;">Enter the exact User ID of the driver created in Supabase Authentication.</small>
          </div>

          <div class="form-group">
            <label class="form-label">Delivery Run Date</label>
            <input type="date" name="date" class="form-input" required value="${dateStr}" />
          </div>

          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <label class="form-label" style="margin-bottom: 0;">Select Stores to Include in this Route</label>
              <button type="button" id="btn-optimize-route" class="btn btn-secondary btn-sm" style="background: #ECFDF5; color: #059669; border-color: #A7F3D0; font-weight: 700; display: flex; align-items: center; gap: 0.4rem;">
                🪄 Auto-Optimize Route (TSP)
              </button>
            </div>
            <div id="route-stores-list" style="max-height: 220px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.75rem; background: #F8FAFC;">
              ${stores.length === 0 ? `
                <div style="font-size: 0.85rem; color: var(--text-muted);">No stores registered yet. Please add stores first.</div>
              ` : stores.map((s, idx) => `
                <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid #E2E8F0; cursor: pointer; font-size: 0.875rem;">
                  <div style="display: flex; align-items: center; gap: 0.6rem;">
                    <input type="checkbox" name="storeIds" value="${s.id}" checked />
                    <span style="font-weight: 600;">${s.name}</span>
                    <span style="color: var(--text-muted); font-size: 0.8rem;">(${s.location})</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.4rem;">
                    <span style="font-size: 0.75rem; color: #64748B;">Seq:</span>
                    <input type="number" name="seq_${s.id}" min="1" value="${idx + 1}" style="width: 45px; padding: 0.2rem; font-size: 0.8rem; text-align: center; border: 1px solid #CBD5E1; border-radius: 4px;" />
                  </div>
                </label>
              `).join('')}
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Run Notes (Optional)</label>
            <input type="text" name="notes" class="form-input" placeholder="e.g. Morning 6 AM priority route" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
            <button type="button" id="btn-cancel-modal" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">Generate Delivery Run</button>
          </div>
        </form>
      </div>
    `;
  }
};
