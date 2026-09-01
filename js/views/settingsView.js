export const settingsView = {
  render: () => {
    return `
      <div style="margin-bottom: 1.5rem;">
        <h2 style="font-size: 1.4rem; font-weight: 800;">Application Settings</h2>
        <p style="font-size: 0.85rem; color: var(--text-muted);">Manage business preferences and demo database</p>
      </div>

      <div class="card" style="max-width: 600px;">
        <h3 class="card-title" style="margin-bottom: 1rem;">Business Profile</h3>
        <div class="form-group">
          <label class="form-label">Business Name</label>
          <input type="text" class="form-input" value="Kovai Dairy Distribution Co." />
        </div>
        <div class="form-group">
          <label class="form-label">GSTIN</label>
          <input type="text" class="form-input" value="33AAAAA0000A1Z5" />
        </div>
        <div class="form-group">
          <label class="form-label">Operating Region</label>
          <input type="text" class="form-input" value="Tamil Nadu (Coimbatore, Pollachi, Tiruppur, Erode)" readonly />
        </div>

        <hr style="margin: 1.5rem 0; border: none; border-top: 1px solid var(--border-color);" />

        <h3 class="card-title" style="margin-bottom: 0.5rem; color:#DC2626;">Demo Storage Control</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">Reset local storage data back to initial seeded demo datasets.</p>
        <button class="btn btn-secondary" id="btn-reset-demo-data" style="color:#DC2626; border-color:#FCA5A5;">
          🔄 Reset Demo Data to Seed Default
        </button>
      </div>
    `;
  }
};
