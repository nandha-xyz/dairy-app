import { storesRepository, deliveryAssignmentsRepository, workflowEngine } from '../repositories/index.js';

export const driverAssignmentModal = {
  renderModal(selectedDate = workflowEngine.getTodayString()) {
    const stores = storesRepository.getAll();
    const assignments = deliveryAssignmentsRepository.getAll().filter(a => a.date === selectedDate);

    return `
      <div class="modal-card" style="max-width: 650px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-color);">
          <h3 style="font-size: 1.2rem; font-weight: 800; margin: 0;">🚛 Manage Driver Delivery Assignments</h3>
          <button type="button" id="btn-cancel-modal" class="btn btn-secondary btn-sm" style="padding: 0.25rem 0.5rem;">✕</button>
        </div>

        <form id="assign-driver-form" style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.5rem;">
          <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 1rem; color: #1E293B;">Assign Store Stop to Driver</h4>

          <div class="form-group">
            <label class="form-label">Driver User ID or Email</label>
            <input type="text" name="driverId" class="form-input" required placeholder="Paste Driver Supabase User UUID (e.g. 8f14a...)" />
            <small style="color: #64748B; font-size: 0.75rem;">Enter the Supabase User ID of the driver account created in Supabase Auth.</small>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Select Store Stop</label>
              <select name="storeId" class="form-select" required>
                <option value="">-- Choose Store --</option>
                ${stores.map(s => `<option value="${s.id}">${s.name} (${s.location})</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Delivery Date</label>
              <input type="date" name="date" class="form-input" required value="${selectedDate}" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Route / Dispatcher Notes (Optional)</label>
            <input type="text" name="notes" class="form-input" placeholder="e.g. Morning 6:30 AM priority delivery" />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem;">
            <button type="submit" class="btn btn-primary">➕ Save Delivery Assignment</button>
          </div>
        </form>

        <!-- Current Assignments List -->
        <div>
          <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.75rem; color: #1E293B;">Active Route Assignments for ${selectedDate} (${assignments.length})</h4>

          ${assignments.length > 0 ? `
            <div class="table-container">
              <table class="data-table" style="font-size: 0.85rem;">
                <thead>
                  <tr>
                    <th>Driver User ID</th>
                    <th>Assigned Store</th>
                    <th>Notes</th>
                    <th style="text-align:right;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${assignments.map(a => {
                    const store = stores.find(s => s.id === a.store_id || s.id === a.storeId);
                    return `
                      <tr>
                        <td style="font-family: monospace; font-size: 0.8rem; color: #2563EB;">${a.driver_id || a.driverId}</td>
                        <td style="font-weight: 600;">${store ? store.name : (a.store_id || 'Store')}</td>
                        <td style="color: var(--text-muted);">${a.notes || '-'}</td>
                        <td style="text-align: right;">
                          <button type="button" class="btn btn-secondary btn-sm btn-delete-assignment" data-assignment-id="${a.id}" style="color:#DC2626; border-color:#FCA5A5; padding:0.2rem 0.5rem;">Delete</button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div style="padding: 1.25rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: var(--radius-sm);">
              No drivers assigned for ${selectedDate} yet. Use the form above to assign stores to drivers.
            </div>
          `}
        </div>
      </div>
    `;
  }
};
