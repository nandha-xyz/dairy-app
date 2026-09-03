import { getTodayDateString } from './data/seededData.js';
import { storesRepository, productsRepository, paymentsRepository, requirementsRepository, invoicesRepository, userRolesRepository, deliveryRunsRepository, dataStore } from './repositories/index.js';
import { workflowEngine } from './services/workflowEngine.js';
import { aiCopilotService } from './services/aiCopilot.js';
import { aiAgentEngine } from './services/aiAgentEngine.js';
import { authService } from './services/authService.js';
import { exportService } from './services/exportService.js';

import { dashboardView } from './views/dashboardView.js';
import { requirementsView } from './views/requirementsView.js';
import { requirementEntryView } from './views/requirementEntryView.js';
import { storesView } from './views/storesView.js';
import { productsView } from './views/productsView.js';
import { ordersView } from './views/ordersView.js';
import { invoicesView } from './views/invoicesView.js';
import { paymentsView } from './views/paymentsView.js';
import { reportsView } from './views/reportsView.js';
import { settingsView } from './views/settingsView.js';
import { driverDashboardView } from './views/driverDashboardView.js';
import { adminStoreMapView } from './views/adminStoreMapView.js';
import { adminDeliveryRunView } from './views/adminDeliveryRunView.js';
import { deliveryChallanView } from './views/deliveryChallanView.js';

class AppController {
  constructor() {
    this.currentDate = getTodayDateString();
    this.currentView = 'dashboard';
    this.selectedStoreId = null;
    this.selectedInvoiceId = null;
    this.activeStoreTab = 'overview';
    this.activeMapFilter = 'all';
    this.userRole = 'pending';
    this.init();
  }

  init() {
    // Set default date in date picker
    const datePicker = document.getElementById('global-date-picker');
    if (datePicker) {
      datePicker.value = this.currentDate;
      datePicker.addEventListener('change', (e) => {
        this.currentDate = e.target.value;
        this.renderCurrentView();
      });
    }

    // Sidebar navigation
    window.addEventListener('hashchange', () => this.handleNavigation());
    this.handleNavigation();

    // Delegate global event listeners
    this.bindGlobalEvents();

    // Bind AI Copilot chat listeners
    this.bindAICopilot();

    // Form submission handlers
    document.addEventListener('submit', async (e) => {
      if (e.target.id === 'form-create-delivery-run') {
        e.preventDefault();
        const formData = new FormData(e.target);
        const driverId = formData.get('driverId')?.trim();
        const runDate = formData.get('date');
        const notes = formData.get('notes')?.trim() || '';

        const storeIds = formData.getAll('storeIds');
        if (!driverId || storeIds.length === 0) {
          alert('Please enter a driver User ID and select at least one store.');
          return;
        }

        try {
          const reqs = requirementsRepository.getByDate(runDate);
          const stores = storesRepository.getAll();

          const stops = storeIds.map(sId => {
            const store = stores.find(st => st.id === sId);
            const req = reqs.find(r => r.storeId === sId);
            const seqVal = formData.get(`seq_${sId}`) || 1;

            const stopItems = (req && req.items) ? req.items.map(item => ({
              product_name: item.productName || item.name,
              quantity: item.quantity,
              unit: item.unit || 'Pkt'
            })) : [];

            return {
              store_id: sId,
              sequence: Number(seqVal),
              store_name: store ? store.name : 'Store',
              address: store ? (store.address || store.location) : '',
              location: store ? store.location : '',
              latitude: store ? store.latitude : null,
              longitude: store ? store.longitude : null,
              contact_person: store ? store.contactPerson : '',
              phone: store ? store.phone : '',
              driver_notes: store ? store.driverNotes : '',
              google_maps_url: store ? store.googleMapsUrl : '',
              items: stopItems
            };
          });

          await deliveryRunsRepository.createRun({
            driver_id: driverId,
            date: runDate,
            notes: notes,
            stops: stops
          });

          this.closeModal();
          this.renderCurrentView();
          alert('✅ Delivery run created successfully and dispatched to driver!');
        } catch(err) {
          alert(`⚠️ Create Delivery Run Failed: ${err.message}`);
        }
      }
    });
  }

  handleNavigation() {
    const hash = window.location.hash.substring(1) || 'dashboard';
    const parts = hash.split('/');

    if (this.userRole === 'driver') {
      this.currentView = 'driver-dashboard';
    } else if (this.userRole === 'pending') {
      this.currentView = 'access-pending';
    } else {
      this.currentView = parts[0] === 'driver-dashboard' ? 'dashboard' : parts[0];
    }

    if (parts[0] === 'store-detail' && parts[1]) {
      this.selectedStoreId = parts[1];
    }
    if (parts[0] === 'invoice-detail' && parts[1]) {
      this.selectedInvoiceId = parts[1];
    }

    // Sidebar collapse
    const collapseBtn = document.getElementById('btn-toggle-sidebar-collapse');
    const appRoot = document.getElementById('app-root');
    if (collapseBtn && appRoot) {
      collapseBtn.onclick = () => {
        appRoot.classList.toggle('sidebar-collapsed');
        const isCollapsed = appRoot.classList.contains('sidebar-collapsed');
        collapseBtn.textContent = isCollapsed ? '▶' : '◀';
      };
    }

    // Mobile slide-out menu
    const mobileToggle = document.getElementById('btn-toggle-sidebar');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    const toggleMobileMenu = () => {
      if (sidebar && sidebarOverlay) {
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('open');
      }
    };

    if (mobileToggle) mobileToggle.onclick = toggleMobileMenu;
    if (sidebarOverlay) sidebarOverlay.onclick = toggleMobileMenu;

    // Active links
    document.querySelectorAll('.nav-link, .mobile-nav-btn').forEach(link => {
      if (link.getAttribute('data-view') === this.currentView) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    if (sidebar && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      sidebarOverlay?.classList.remove('open');
    }

    this.renderCurrentView();
  }

  renderCurrentView() {
    const viewport = document.getElementById('app-viewport');
    const titleElem = document.getElementById('top-bar-title');
    const subtitleElem = document.getElementById('top-bar-subtitle');

    if (!viewport || !titleElem || !subtitleElem) return;

    if (this.userRole === 'pending') {
      titleElem.textContent = 'Account Authorization Required';
      subtitleElem.textContent = 'Contact your system administrator for role assignment';
      viewport.innerHTML = `
        <div style="max-width: 550px; margin: 3rem auto; padding: 0 1rem;">
          <div class="card" style="text-align: center; padding: 3rem 1.5rem; border-radius: 16px;">
            <div style="width: 72px; height: 72px; margin: 0 auto 1.25rem auto; background: #FEF3C7; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; color: #D97706;">
              🔒
            </div>
            <h3 style="font-size: 1.3rem; font-weight: 800; color: #0F172A; margin: 0 0 0.5rem 0;">Access Authorization Pending</h3>
            <p style="font-size: 0.9rem; color: #64748B; margin: 0 0 1.5rem 0; line-height: 1.5;">
              Your account has been created successfully, but your role (<strong>Admin</strong> or <strong>Driver</strong>) has not been assigned in Supabase yet.
            </p>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 0.85rem; border-radius: 8px; font-size: 0.8rem; color: #334155; text-align: left; margin-bottom: 1.5rem;">
              <strong>Admin Instruction:</strong><br/>
              Run the following query in your Supabase SQL Editor to grant access:<br/>
              <code style="display: block; background: #EFF6FF; padding: 0.4rem; margin-top: 0.4rem; border-radius: 4px; color: #2563EB; font-size: 0.75rem;">
                INSERT INTO public.user_roles (user_id, role) VALUES ('${authService.getUser()?.id || 'UUID'}', 'admin');
              </code>
            </div>
            <div style="display: flex; gap: 1rem; justify-content: center;">
              <button class="btn btn-secondary" onclick="window.location.reload();">🔄 Refresh Page</button>
              <button class="btn btn-primary" onclick="localStorage.clear(); window.location.reload();">Logout & Fix Session</button>
            </div>
          </div>
        </div>
      `;
      return;
    }

    if (this.userRole === 'driver') {
      this.currentView = 'driver-dashboard';
      titleElem.textContent = "Driver Delivery Portal";
      subtitleElem.textContent = `Today's pickup manifest & assigned route stops • ${this.currentDate}`;
      const user = authService.getUser();
      const runs = deliveryRunsRepository.getByDriverAndDate(user ? user.id : '', this.currentDate);
      viewport.innerHTML = driverDashboardView.render(runs, this.currentDate);
      setTimeout(() => driverDashboardView.initLeafletMap(runs), 100);
      return;
    }

    switch (this.currentView) {
      case 'dashboard':
        titleElem.textContent = 'Dashboard';
        subtitleElem.textContent = `Daily operations overview • ${this.currentDate}`;
        viewport.innerHTML = dashboardView.render(this.currentDate);
        break;

      case 'requirements':
        titleElem.textContent = 'Daily Requirements';
        subtitleElem.textContent = `Store order requirements for ${this.currentDate}`;
        viewport.innerHTML = requirementsView.render(this.currentDate);
        this.bindRequirementsEvents();
        break;

      case 'stores':
        titleElem.textContent = 'Stores Directory';
        subtitleElem.textContent = 'Registered retail distribution partners';
        viewport.innerHTML = storesView.renderList();
        break;

      case 'store-map':
        titleElem.textContent = 'Store Geolocation Directory';
        subtitleElem.textContent = 'Store location coordinates and Google Maps integration';
        viewport.innerHTML = adminStoreMapView.render(this.currentDate, this.activeMapFilter);
        setTimeout(() => adminStoreMapView.initLeafletMap(), 100);
        break;

      case 'delivery-dispatch':
        titleElem.textContent = 'Delivery Dispatcher';
        subtitleElem.textContent = 'Create driver runs, sequence stops, and dispatch routes';
        viewport.innerHTML = adminDeliveryRunView.render(this.currentDate);
        break;

      case 'store-detail':
        titleElem.textContent = 'Store Profile';
        subtitleElem.textContent = 'Account overview and order history';
        viewport.innerHTML = storesView.renderDetail(this.selectedStoreId, this.activeStoreTab);
        break;

      case 'products':
        titleElem.textContent = 'Product Catalog';
        subtitleElem.textContent = 'Master product prices and tax configuration';
        viewport.innerHTML = productsView.render();
        break;

      case 'orders':
        titleElem.textContent = 'Purchase Orders';
        subtitleElem.textContent = `Consolidated supplier requirements for ${this.currentDate}`;
        viewport.innerHTML = ordersView.render(this.currentDate);
        ordersView.bindEvents(this.currentDate);
        break;

      case 'invoices':
        titleElem.textContent = 'Store Invoices';
        subtitleElem.textContent = 'Generated distribution billing records';
        viewport.innerHTML = invoicesView.renderList();
        break;

      case 'invoice-detail':
        titleElem.textContent = 'Tax Invoice Preview';
        subtitleElem.textContent = 'Printable store tax invoice';
        viewport.innerHTML = invoicesView.renderDetail(this.selectedInvoiceId);
        break;

      case 'payments':
        titleElem.textContent = 'Payment Management';
        subtitleElem.textContent = 'Collections and outstanding balances';
        viewport.innerHTML = paymentsView.renderList();
        break;

      case 'reports':
        titleElem.textContent = 'Analytics Reports';
        subtitleElem.textContent = 'Business performance and demand trends';
        viewport.innerHTML = reportsView.render();
        break;

      case 'settings':
        titleElem.textContent = 'Settings';
        subtitleElem.textContent = 'System preferences and data backups';
        viewport.innerHTML = settingsView.render();
        this.bindSettingsEvents();
        break;

      default:
        titleElem.textContent = 'Dashboard';
        subtitleElem.textContent = `Daily operations overview • ${this.currentDate}`;
        viewport.innerHTML = dashboardView.render(this.currentDate);
    }
  }

  bindGlobalEvents() {
    document.addEventListener('click', async (e) => {
      // Driver action: Mark Stop as Delivered via RPC
      const markDeliveredBtn = e.target.closest('.btn-mark-stop-delivered');
      if (markDeliveredBtn && markDeliveredBtn.dataset.stopId) {
        try {
          await deliveryRunsRepository.updateStopStatus(markDeliveredBtn.dataset.stopId, 'Delivered');
          this.renderCurrentView();
        } catch(err) {
          alert(`⚠️ Failed to update delivery status: ${err.message}`);
        }
      }

      const markPendingBtn = e.target.closest('.btn-mark-stop-pending');
      if (markPendingBtn && markPendingBtn.dataset.stopId) {
        try {
          await deliveryRunsRepository.updateStopStatus(markPendingBtn.dataset.stopId, 'Pending');
          this.renderCurrentView();
        } catch(err) {
          alert(`⚠️ Failed to update delivery status: ${err.message}`);
        }
      }

      // Admin Map filter buttons
      const mapFilterBtn = e.target.closest('.filter-map-btn');
      if (mapFilterBtn && mapFilterBtn.dataset.filter) {
        this.activeMapFilter = mapFilterBtn.dataset.filter;
        this.renderCurrentView();
      }

      // Open Create Delivery Run Modal
      if (e.target.closest('#btn-create-delivery-run')) {
        this.openCreateDeliveryRunModal();
      }

      // Optimize Route
      if (e.target.closest('#btn-optimize-route')) {
        this.optimizeRoute();
      }

      // Delete Delivery Run
      const delRunBtn = e.target.closest('.btn-delete-delivery-run');
      if (delRunBtn && delRunBtn.dataset.runId) {
        if (confirm('🗑️ Delete this delivery run and its assigned stops?')) {
          try {
            await deliveryRunsRepository.deleteRun(delRunBtn.dataset.runId);
            this.renderCurrentView();
          } catch(err) {
            alert(`⚠️ Delete Run Failed: ${err.message}`);
          }
        }
      }

      // Print Challan
      const printChallanBtn = e.target.closest('.btn-print-challan');
      if (printChallanBtn && printChallanBtn.dataset.runId) {
        const challanHtml = deliveryChallanView.render(printChallanBtn.dataset.runId);
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(challanHtml);
          printWindow.document.close();
        } else {
          alert('Popup blocked! Please allow popups for this site to print the challan.');
        }
      }

      // View pending stores shortcut
      if (e.target.id === 'btn-view-pending') {
        window.location.hash = '#requirements';
      }

      // Enter requirement for store from dashboard (navigates to grid)
      const enterReqBtn = e.target.closest('.btn-enter-req');
      if (enterReqBtn) {
        window.location.hash = '#requirements';
        const storeIdToFocus = enterReqBtn.dataset.storeId;
        if (storeIdToFocus) {
          setTimeout(() => {
            const input = document.querySelector(`.req-qty-input[data-store-id="${storeIdToFocus}"]`);
            if (input) {
              input.scrollIntoView({ behavior: 'smooth', block: 'center' });
              input.focus();
              input.style.backgroundColor = '#FEF3C7'; // Highlight briefly
              setTimeout(() => input.style.backgroundColor = '', 2000);
            }
          }, 200); // Wait for hash change re-render
        }
      }

      // Create PO shortcut
      if (e.target.id === 'btn-create-po') {
        window.location.hash = '#orders';
      }

      // Auto-fill all dashboard button
      if (e.target.id === 'btn-autofill-all-dashboard' || e.target.id === 'ai-btn-autofill-all') {
        this.autoFillAllPendingStores();
      }

      // View store detail link
      const storeDetailBtn = e.target.closest('.btn-view-store-detail');
      if (storeDetailBtn) {
        e.preventDefault();
        const storeId = storeDetailBtn.dataset.storeId;
        window.location.hash = `#store-detail/${storeId}`;
      }

      // View invoice detail link
      const invBtn = e.target.closest('.btn-view-invoice');
      if (invBtn) {
        const invId = invBtn.dataset.invoiceId;
        window.location.hash = `#invoice-detail/${invId}`;
      }

      // Back to invoices button
      if (e.target.id === 'btn-back-to-invoices') {
        window.location.hash = '#invoices';
      }

      // Record payment modal button
      const payModalBtn = e.target.closest('.btn-record-payment-modal');
      if (payModalBtn) {
        const invId = payModalBtn.dataset.invoiceId;
        this.openRecordPaymentModal(invId);
      }

      // Close modal backdrop
      if (e.target.id === 'modal-backdrop' || e.target.id === 'btn-close-modal' || e.target.id === 'btn-cancel-modal') {
        this.closeModal();
      }

      // Tab switcher in store detail
      const tabBtn = e.target.closest('.tab-btn');
      if (tabBtn && tabBtn.dataset.tab) {
        this.activeStoreTab = tabBtn.dataset.tab;
        this.renderCurrentView();
      }

      // Add Store modal
      if (e.target.id === 'btn-add-store') {
        this.openAddStoreModal();
      }

      // Add Product modal
      if (e.target.id === 'btn-add-product') {
        this.openAddProductModal();
      }

      // Edit & Delete Store handlers
      const editStoreBtn = e.target.closest('.btn-edit-store');
      if (editStoreBtn && editStoreBtn.dataset.storeId) {
        this.openAddStoreModal(editStoreBtn.dataset.storeId);
      }

      const deleteStoreBtn = e.target.closest('.btn-delete-store');
      if (deleteStoreBtn && deleteStoreBtn.dataset.storeId) {
        const storeId = deleteStoreBtn.dataset.storeId;
        const store = storesRepository.getById(storeId);
        if (confirm(`🗑️ Delete Store "${store ? store.name : 'Store'}"?\n\nThis will permanently delete this store from Supabase along with its associated records.`)) {
          this.handleDeleteStore(storeId);
        }
      }

      // Edit & Delete Product handlers
      const editProductBtn = e.target.closest('.btn-edit-product');
      if (editProductBtn && editProductBtn.dataset.productId) {
        this.openAddProductModal(editProductBtn.dataset.productId);
      }

      const deleteProductBtn = e.target.closest('.btn-delete-product');
      if (deleteProductBtn && deleteProductBtn.dataset.productId) {
        const productId = deleteProductBtn.dataset.productId;
        const product = productsRepository.getById(productId);
        if (confirm(`🗑️ Delete Product "${product ? product.name : 'Product'}"?\n\nThis will permanently remove this product from Supabase catalog.`)) {
          this.handleDeleteProduct(productId);
        }
      }

      // Edit & Delete Invoice handlers
      const deleteInvoiceBtn = e.target.closest('.btn-delete-invoice');
      if (deleteInvoiceBtn && deleteInvoiceBtn.dataset.invoiceId) {
        const invoiceId = deleteInvoiceBtn.dataset.invoiceId;
        if (confirm(`🗑️ Delete Invoice #${invoiceId}?\n\nThis will remove the billing record from Supabase.`)) {
          this.handleDeleteInvoice(invoiceId);
        }
      }

      // Fast requirement drawer close
      if (e.target.id === 'btn-close-drawer') {
        this.closeRequirementDrawer();
      }
    });
  }

  async optimizeRoute() {
    const form = document.getElementById('form-create-delivery-run');
    if (!form) return;

    const optimizeBtn = document.getElementById('btn-optimize-route');
    const originalText = optimizeBtn.innerHTML;
    optimizeBtn.innerHTML = '⏳ Optimizing...';
    optimizeBtn.disabled = true;

    try {
      const checkedBoxes = Array.from(form.querySelectorAll('input[name="storeIds"]:checked'));
      if (checkedBoxes.length < 2) {
        alert('Please select at least 2 stores to optimize.');
        return;
      }

      const stores = storesRepository.getAll();
      const selectedStores = checkedBoxes.map(cb => stores.find(s => s.id === cb.value)).filter(s => s && s.latitude && s.longitude);

      if (selectedStores.length < 2) {
        alert('Not enough selected stores have GPS coordinates to optimize.');
        return;
      }

      // OSRM Trip API: computes the Traveling Salesperson Problem (TSP)
      const coords = selectedStores.map(s => `${s.longitude},${s.latitude}`).join(';');
      const url = `https://router.project-osrm.org/trip/v1/driving/${coords}?roundtrip=false&source=first`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch route optimization.');
      
      const data = await response.json();
      if (data.code !== 'Ok' || !data.waypoints) throw new Error('No optimal route found.');

      // OSRM returns waypoints with waypoint_index corresponding to the order in the TSP route
      // We map our selectedStores index to the waypoint_index
      const orderedStores = [];
      data.waypoints.forEach(wp => {
        orderedStores[wp.waypoint_index] = selectedStores[wp.trips_index];
      });

      // Update the sequence input boxes in the form
      orderedStores.forEach((store, index) => {
        const seqInput = form.querySelector(`input[name="seq_${store.id}"]`);
        if (seqInput) {
          seqInput.value = index + 1;
        }
      });

      // Visually sort the DOM elements in the list based on new sequence
      const listContainer = document.getElementById('route-stores-list');
      const storeLabels = Array.from(listContainer.querySelectorAll('label'));
      
      storeLabels.sort((a, b) => {
        const seqA = parseInt(a.querySelector('input[type="number"]').value, 10) || 999;
        const seqB = parseInt(b.querySelector('input[type="number"]').value, 10) || 999;
        return seqA - seqB;
      });

      storeLabels.forEach(label => listContainer.appendChild(label));

    } catch (error) {
      console.error(error);
      alert('⚠️ Optimization failed: ' + error.message);
    } finally {
      optimizeBtn.innerHTML = originalText;
      optimizeBtn.disabled = false;
    }
  }

  openCreateDeliveryRunModal() {
    const backdrop = document.getElementById('modal-backdrop');
    if (!backdrop) return;
    backdrop.innerHTML = adminDeliveryRunView.renderCreateModal(this.currentDate);
    backdrop.classList.add('open');
  }

  async handleDeleteStore(storeId) {
    try {
      await storesRepository.delete(storeId);
      await dataStore.syncAllFromSupabase();
      this.renderCurrentView();
    } catch(err) {
      alert(`⚠️ Delete Failed: ${err.message}`);
    }
  }

  async handleDeleteProduct(productId) {
    try {
      await productsRepository.delete(productId);
      await dataStore.syncAllFromSupabase();
      this.renderCurrentView();
    } catch(err) {
      alert(`⚠️ Delete Failed: ${err.message}`);
    }
  }

  async handleDeleteInvoice(invoiceId) {
    try {
      await invoicesRepository.delete(invoiceId);
      await dataStore.syncAllFromSupabase();
      this.renderCurrentView();
    } catch(err) {
      alert(`⚠️ Delete Failed: ${err.message}`);
    }
  }

  closeRequirementDrawer() {
    const drawer = document.getElementById('requirement-drawer');
    if (drawer) drawer.classList.remove('open');
  }

  openAddStoreModal(storeId = null) {
    const backdrop = document.getElementById('modal-backdrop');
    if (!backdrop) return;
    const store = storeId ? storesRepository.getById(storeId) : null;
    const isEdit = !!store;

    backdrop.innerHTML = `
      <div class="modal-card" style="max-width: 600px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; padding-bottom:0.75rem; border-bottom:1px solid var(--border-color);">
          <h3 style="font-size:1.2rem; font-weight:800; margin:0;">${isEdit ? '✏️ Edit Store & Geolocation Details' : '➕ Register New Retail Store'}</h3>
          <button id="btn-cancel-modal" class="btn btn-secondary btn-sm" style="padding:0.25rem 0.5rem;">✕</button>
        </div>
        <form id="form-add-store">
          <input type="hidden" name="storeId" value="${isEdit ? store.id : ''}">
          <div class="form-group">
            <label class="form-label">Store Code</label>
            <input type="text" name="code" class="form-input" required value="${isEdit ? store.code : 'STR-' + Math.floor(100 + Math.random() * 900)}" />
          </div>
          <div class="form-group">
            <label class="form-label">Store Name</label>
            <input type="text" name="name" class="form-input" required placeholder="e.g. Kovai Milk Point" value="${isEdit ? store.name : ''}" />
          </div>
          <div class="form-group">
            <label class="form-label">Location / Route Area</label>
            <input type="text" name="location" class="form-input" required placeholder="e.g. Gandhipuram" value="${isEdit ? store.location : ''}" />
          </div>
          <div class="form-group">
            <label class="form-label">Street Address</label>
            <input type="text" name="address" class="form-input" placeholder="e.g. 142 Crosscut Road, Gandhipuram" value="${isEdit ? (store.address || '') : ''}" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Latitude Coordinates</label>
              <input type="number" step="any" name="latitude" class="form-input" placeholder="e.g. 11.0168" value="${isEdit && store.latitude ? store.latitude : ''}" />
            </div>
            <div class="form-group">
              <label class="form-label">Longitude Coordinates</label>
              <input type="number" step="any" name="longitude" class="form-input" placeholder="e.g. 76.9558" value="${isEdit && store.longitude ? store.longitude : ''}" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Optional Google Maps URL</label>
            <input type="url" name="googleMapsUrl" class="form-input" placeholder="https://maps.google.com/..." value="${isEdit ? (store.googleMapsUrl || '') : ''}" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Contact Person</label>
              <input type="text" name="contactPerson" class="form-input" placeholder="e.g. Rajesh Kumar" value="${isEdit ? (store.contactPerson || '') : ''}" />
            </div>
            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input type="tel" name="phone" class="form-input" placeholder="e.g. +91 98765 43210" value="${isEdit ? (store.phone || '') : ''}" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Driver Delivery Note / Special Access Instructions</label>
            <input type="text" name="driverNotes" class="form-input" placeholder="e.g. Deliver via side entrance behind main gate" value="${isEdit ? (store.driverNotes || '') : ''}" />
          </div>

          <div style="display:flex; justify-content:flex-end; gap:0.75rem; margin-top:1.5rem;">
            <button type="button" id="btn-cancel-modal" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Save Store'}</button>
          </div>
        </form>
      </div>
    `;
    backdrop.classList.add('open');

    const form = document.getElementById('form-add-store');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const sId = formData.get('storeId');

        const storeData = {
          code: formData.get('code'),
          name: formData.get('name'),
          location: formData.get('location'),
          address: formData.get('address'),
          latitude: formData.get('latitude') ? Number(formData.get('latitude')) : null,
          longitude: formData.get('longitude') ? Number(formData.get('longitude')) : null,
          googleMapsUrl: formData.get('googleMapsUrl'),
          contactPerson: formData.get('contactPerson'),
          phone: formData.get('phone'),
          driverNotes: formData.get('driverNotes')
        };

        try {
          if (sId) {
            storeData.id = sId;
          }
          await storesRepository.save(storeData);
          this.closeModal();
          await dataStore.syncAllFromSupabase();
          this.renderCurrentView();
        } catch (err) {
          alert(`⚠️ Cloud Save Failed: ${err.message}`);
        }
      };
    }
  }

  openAddProductModal(productId = null) {
    const backdrop = document.getElementById('modal-backdrop');
    if (!backdrop) return;
    const product = productId ? productsRepository.getById(productId) : null;
    const isEdit = !!product;

    backdrop.innerHTML = `
      <div class="modal-card" style="max-width: 550px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; padding-bottom:0.75rem; border-bottom:1px solid var(--border-color);">
          <h3 style="font-size:1.2rem; font-weight:800; margin:0;">${isEdit ? '✏️ Edit Product' : '➕ Add Catalog Product'}</h3>
          <button id="btn-cancel-modal" class="btn btn-secondary btn-sm" style="padding:0.25rem 0.5rem;">✕</button>
        </div>
        <form id="form-add-product">
          <input type="hidden" name="productId" value="${isEdit ? product.id : ''}">
          <div class="form-group">
            <label class="form-label">SKU Code</label>
            <input type="text" name="sku" class="form-input" required value="${isEdit ? product.sku : 'SKU-' + Math.floor(100 + Math.random() * 900)}" />
          </div>
          <div class="form-group">
            <label class="form-label">Product Name</label>
            <input type="text" name="name" class="form-input" required placeholder="e.g. Full Cream Milk 500ml" value="${isEdit ? product.name : ''}" />
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
            <div class="form-group">
              <label class="form-label">Category</label>
              <input type="text" name="category" class="form-input" required placeholder="e.g. Milk" value="${isEdit ? product.category : 'Milk'}" />
            </div>
            <div class="form-group">
              <label class="form-label">Unit</label>
              <input type="text" name="unit" class="form-input" required placeholder="e.g. Pkt" value="${isEdit ? product.unit : 'Pkt'}" />
            </div>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
            <div class="form-group">
              <label class="form-label">Selling Price (₹)</label>
              <input type="number" step="0.01" name="sellingPrice" class="form-input" required value="${isEdit ? product.sellingPrice : 30}" />
            </div>
            <div class="form-group">
              <label class="form-label">Purchase Price (₹)</label>
              <input type="number" step="0.01" name="purchasePrice" class="form-input" required value="${isEdit ? product.purchasePrice : 24}" />
            </div>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:0.75rem; margin-top:1.5rem;">
            <button type="button" id="btn-cancel-modal" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Save Product'}</button>
          </div>
        </form>
      </div>
    `;
    backdrop.classList.add('open');

    const form = document.getElementById('form-add-product');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const pId = formData.get('productId');

        const productData = {
          sku: formData.get('sku'),
          name: formData.get('name'),
          category: formData.get('category'),
          unit: formData.get('unit'),
          sellingPrice: parseFloat(formData.get('sellingPrice')),
          purchasePrice: parseFloat(formData.get('purchasePrice'))
        };

        try {
          if (pId) {
            productData.id = pId;
          }
          await productsRepository.save(productData);
          this.closeModal();
          await dataStore.syncAllFromSupabase();
          this.renderCurrentView();
        } catch (err) {
          alert(`⚠️ Cloud Save Failed: ${err.message}`);
        }
      };
    }
  }

  openRecordPaymentModal(invoiceId) {
    const backdrop = document.getElementById('modal-backdrop');
    if (!backdrop) return;

    const invoices = invoicesRepository.getAll();
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    backdrop.innerHTML = `
      <div class="modal-card" style="max-width: 500px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; padding-bottom:0.75rem; border-bottom:1px solid var(--border-color);">
          <h3 style="font-size:1.2rem; font-weight:800; margin:0;">💳 Record Payment Collection</h3>
          <button id="btn-cancel-modal" class="btn btn-secondary btn-sm" style="padding:0.25rem 0.5rem;">✕</button>
        </div>
        
        <form id="form-record-payment">
          <input type="hidden" name="invoiceId" value="${invoice.id}">
          <input type="hidden" name="storeId" value="${invoice.storeId}">
          <input type="hidden" name="storeName" value="${invoice.storeName}">

          <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:0.85rem; border-radius:var(--radius-md); margin-bottom:1.25rem;">
            <div style="font-size:0.8rem; color:var(--text-muted);">Invoice: <strong>${invoice.invoiceNumber}</strong></div>
            <div style="font-weight:700; color:var(--text-main);">${invoice.storeName}</div>
            <div style="display:flex; justify-content:space-between; margin-top:0.4rem; font-size:0.85rem;">
              <span>Total Bill: ₹${invoice.grandTotal}</span>
              <span style="color:#DC2626; font-weight:700;">Outstanding: ₹${invoice.outstandingAmount}</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Payment Date</label>
            <input type="date" name="date" class="form-input" required value="${this.currentDate}" />
          </div>

          <div class="form-group">
            <label class="form-label">Amount Collected (₹)</label>
            <input type="number" step="0.5" name="amount" class="form-input" required max="${invoice.outstandingAmount}" value="${invoice.outstandingAmount}" />
          </div>

          <div class="form-group">
            <label class="form-label">Payment Mode</label>
            <select name="mode" class="form-select">
              <option value="UPI">UPI / GPay / PhonePe</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Reference No. / UTR (Optional)</label>
            <input type="text" name="referenceNo" class="form-input" placeholder="e.g. UPI/3289192019" />
          </div>

          <div style="display:flex; justify-content:flex-end; gap:0.75rem; margin-top:1.5rem;">
            <button type="button" id="btn-cancel-modal" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">Submit Payment</button>
          </div>
        </form>
      </div>
    `;
    backdrop.classList.add('open');

    const form = document.getElementById('form-record-payment');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);

        const paymentData = {
          invoiceId: formData.get('invoiceId'),
          storeId: formData.get('storeId'),
          storeName: formData.get('storeName'),
          amount: parseFloat(formData.get('amount')),
          date: formData.get('date'),
          mode: formData.get('mode'),
          referenceNo: formData.get('referenceNo')
        };

        try {
          await paymentsRepository.recordPayment(paymentData);
          this.closeModal();
          await dataStore.syncAllFromSupabase();
          this.renderCurrentView();
        } catch (err) {
          alert(`⚠️ Payment Save Failed: ${err.message}`);
        }
      };
    }
  }

  async autoFillAllPendingStores() {
    try {
      const summary = await workflowEngine.confirmAllRequirementsForDate(this.currentDate);
      await dataStore.syncAllFromSupabase();
      this.renderCurrentView();
      alert(`✅ Success: Updated ${summary.count} store requirements for ${this.currentDate}`);
    } catch(err) {
      alert(`⚠️ Auto-fill Failed: ${err.message}`);
    }
  }

  closeModal() {
    const backdrop = document.getElementById('modal-backdrop');
    if (backdrop) {
      backdrop.classList.remove('open');
      backdrop.innerHTML = '';
    }
  }

  bindRequirementsEvents() {
    const locFilter = document.getElementById('req-location-filter');
    const statFilter = document.getElementById('req-status-filter');
    const grid = document.getElementById('requirements-grid');

    if (locFilter && statFilter) {
      const updateReqs = () => {
        const viewport = document.getElementById('app-viewport');
        if (viewport) {
          viewport.innerHTML = requirementsView.render(this.currentDate, statFilter.value, locFilter.value);
          this.bindRequirementsEvents();
        }
      };
      locFilter.addEventListener('change', updateReqs);
      statFilter.addEventListener('change', updateReqs);
    }

    if (grid) {
      // Basic Arrow Key Navigation
      grid.addEventListener('keydown', (e) => {
        if (!e.target.classList.contains('req-qty-input')) return;
        const inputs = Array.from(grid.querySelectorAll('.req-qty-input'));
        const index = inputs.indexOf(e.target);
        
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          if (inputs[index + 1]) inputs[index + 1].focus();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          if (inputs[index - 1]) inputs[index - 1].focus();
        }
      });

      // Auto-save debounce
      let debounceTimeout;
      grid.addEventListener('input', (e) => {
        if (e.target.classList.contains('req-qty-input') || e.target.classList.contains('req-status-select')) {
          clearTimeout(debounceTimeout);
          const storeId = e.target.dataset.storeId;
          this.updateLocalTotal(storeId);
          
          debounceTimeout = setTimeout(async () => {
             this.saveStoreRequirement(storeId);
          }, 800);
        }
      });
    }
  }

  updateLocalTotal(storeId) {
    const row = document.querySelector(`tr[data-store-id="${storeId}"]`);
    if (!row) return;
    const qtyInputs = row.querySelectorAll('.req-qty-input');
    let totalAmount = 0;
    qtyInputs.forEach(input => {
      const qty = parseFloat(input.value);
      if (!isNaN(qty) && qty > 0) {
        totalAmount += qty * parseFloat(input.dataset.price);
      }
    });
    const totalCell = document.getElementById(`total-${storeId}`);
    if (totalCell) {
      totalCell.textContent = workflowEngine.formatCurrency(totalAmount);
    }
  }

  async saveStoreRequirement(storeId) {
    const row = document.querySelector(`tr[data-store-id="${storeId}"]`);
    if (!row) return;

    const qtyInputs = row.querySelectorAll('.req-qty-input');
    const statusSelect = row.querySelector('.req-status-select');
    
    let items = [];
    let totalAmount = 0;

    qtyInputs.forEach(input => {
      const qty = parseFloat(input.value);
      if (!isNaN(qty) && qty > 0) {
        const price = parseFloat(input.dataset.price);
        totalAmount += qty * price;
        items.push({
          productId: input.dataset.productId,
          productName: productsRepository.getById(input.dataset.productId)?.name,
          quantity: qty,
          rate: price
        });
      }
    });

    const status = statusSelect ? statusSelect.value : 'Draft';
    const existingReq = requirementsRepository.getByStoreAndDate(storeId, this.currentDate) || {};

    const payload = {
      ...existingReq,
      storeId,
      date: this.currentDate,
      status: items.length > 0 && status === 'Pending' ? 'Draft' : status,
      items,
      totalAmount,
      lastUpdated: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };

    try {
      await requirementsRepository.save(payload);
      if (statusSelect && items.length > 0 && statusSelect.value === 'Pending') {
         statusSelect.value = 'Draft';
      }
      dataStore.syncAllFromSupabase();
    } catch (err) {
      console.error('Failed to auto-save requirement:', err);
    }
  }

  bindSettingsEvents() {
    document.getElementById('btn-reset-demo-data')?.addEventListener('click', () => {
      if (confirm('Reset demo database back to initial seed data?')) {
        localStorage.clear();
        window.location.reload();
      }
    });

    document.getElementById('btn-export-backup-json')?.addEventListener('click', () => {
      exportService.downloadFullBackupJson();
    });

    document.getElementById('btn-export-stores-csv')?.addEventListener('click', () => {
      exportService.downloadStoresCsv();
    });

    document.getElementById('btn-export-products-csv')?.addEventListener('click', () => {
      exportService.downloadProductsCsv();
    });

    document.getElementById('btn-export-invoices-csv')?.addEventListener('click', () => {
      exportService.downloadInvoicesCsv();
    });

    document.getElementById('btn-export-payments-csv')?.addEventListener('click', () => {
      exportService.downloadPaymentsCsv();
    });
  }

  bindAICopilot() {
    const btnToggle = document.getElementById('btn-toggle-ai-chat');
    const chatWindow = document.getElementById('ai-chat-window');
    const btnClose = document.getElementById('btn-close-ai-chat');
    const btnSend = document.getElementById('ai-send-btn');
    const input = document.getElementById('ai-input-field');

    if (btnToggle && chatWindow) {
      btnToggle.onclick = () => {
        const isHidden = chatWindow.style.display === 'none' || chatWindow.style.display === '';
        chatWindow.style.display = isHidden ? 'flex' : 'none';
        if (isHidden) input?.focus();
      };
    }

    if (btnClose && chatWindow) {
      btnClose.onclick = () => {
        chatWindow.style.display = 'none';
      };
    }

    const handleSend = async () => {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';

      aiCopilotService.appendMessage('user', text);
      const thinkingId = aiCopilotService.appendThinkingMessage();

      try {
        const result = await aiAgentEngine.executeUserInstruction(text, this.currentDate);
        aiCopilotService.removeMessage(thinkingId);
        aiCopilotService.appendMessage('assistant', result.response);

        if (result.requiresUIRefresh) {
          await dataStore.syncAllFromSupabase();
          this.renderCurrentView();
        }
      } catch (err) {
        aiCopilotService.removeMessage(thinkingId);
        aiCopilotService.appendMessage('assistant', `⚠️ Sorry, I encountered an error executing your request: ${err.message}`);
      }
    };

    if (btnSend) btnSend.onclick = handleSend;
    if (input) {
      input.onkeydown = (e) => {
        if (e.key === 'Enter') handleSend();
      };
    }
  }
}

// ==========================================================================
// SUPABASE AUTHENTICATION MANAGER & APP INITIALIZATION
// ==========================================================================
function showAlert(message, isSuccess = false) {
  const alertEl = document.getElementById('auth-alert');
  if (!alertEl) return;
  alertEl.className = `auth-alert ${isSuccess ? 'auth-alert-success' : 'auth-alert-error'}`;
  alertEl.innerHTML = `${isSuccess ? '✅' : '⚠️'} <span>${message}</span>`;
  alertEl.style.display = 'flex';
}

function hideAlert() {
  const alertEl = document.getElementById('auth-alert');
  if (alertEl) alertEl.style.display = 'none';
}

function setAuthLoading(isLoading) {
  const btn = document.getElementById('auth-submit-btn');
  const text = document.getElementById('auth-submit-text');
  const spinner = document.getElementById('auth-submit-spinner');
  if (!btn || !text || !spinner) return;

  btn.disabled = isLoading;
  if (isLoading) {
    text.style.display = 'none';
    spinner.style.display = 'inline-block';
  } else {
    text.style.display = 'inline-block';
    spinner.style.display = 'none';
  }
}

function setupAuthUI() {
  const authForm = document.getElementById('auth-form');
  const btnSignout = document.getElementById('btn-signout');

  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();
      const email = document.getElementById('auth-email')?.value.trim();
      const password = document.getElementById('auth-password')?.value;

      if (!email || !password) {
        showAlert('Please enter both email and password.');
        return;
      }

      setAuthLoading(true);

      try {
        const { data, error } = await authService.signIn(email, password);
        if (error) {
          showAlert(error.message || 'Sign in failed. Check your credentials.');
        } else if (data.session) {
          updateUIForSession(data.session);
        }
      } catch (err) {
        showAlert(err.message || 'An unexpected error occurred during sign-in.');
      } finally {
        setAuthLoading(false);
      }
    });
  }

  if (btnSignout) {
    btnSignout.addEventListener('click', async () => {
      await authService.signOut();
      updateUIForSession(null);
    });
  }
}

async function updateUIForSession(session) {
  const authContainer = document.getElementById('auth-container');
  const appRoot = document.getElementById('app-root');
  const userEmailDisplay = document.getElementById('user-email-display');
  const userRoleDisplay = document.getElementById('user-role-display');
  const userAvatarBadge = document.getElementById('user-avatar-badge');

  if (session && session.user) {
    if (authContainer) authContainer.style.display = 'none';
    if (appRoot) appRoot.style.display = 'flex';

    const userEmail = session.user.email || 'User';
    if (userEmailDisplay) userEmailDisplay.textContent = userEmail;
    if (userAvatarBadge) userAvatarBadge.textContent = userEmail.substring(0, 2).toUpperCase();

    // Check user role from Supabase user_roles
    // Cache user globally so authService.getUser() can return it synchronously
    window.__dairyAppCurrentUser = session.user;
    
    console.log("AUTH USER ID:", session.user.id);
    console.log("AUTH SESSION EXISTS:", !!session);
    console.log("AUTH SESSION USER ID:", session.user.id);

    const role = await userRolesRepository.getRole(session.user);
    window.currentUserRole = role;

    // IMMEDIATE UI UPDATE: Do this BEFORE any data fetching can crash!
    if (!window.app) {
      window.app = new AppController();
    }
    window.app.userRole = role;
    window.app.handleNavigation();

    if (role === 'driver' && session.user) {
      startDriverTracking(session.user.id);
    }

    if (userRoleDisplay) {
      if (role === 'admin') {
        userRoleDisplay.textContent = '👑 Admin / Business Owner';
        userRoleDisplay.style.color = '#10B981';
      } else if (role === 'driver') {
        userRoleDisplay.textContent = '🚛 Driver (Field Portal)';
        userRoleDisplay.style.color = '#60A5FA';
      } else {
        userRoleDisplay.textContent = '🔒 Role Pending';
        userRoleDisplay.style.color = '#F59E0B';
      }
    }

    // Toggle navigation buttons based on role
    const navLinks = document.querySelectorAll('#sidebar .nav-link, .mobile-nav-btn');
    navLinks.forEach(link => {
      const view = link.getAttribute('data-view');
      if (role === 'driver') {
        link.style.display = (view === 'driver-dashboard') ? 'flex' : 'none';
      } else if (role === 'admin') {
        link.style.display = (view === 'driver-dashboard') ? 'none' : 'flex';
      } else {
        link.style.display = 'none';
      }
    });

    const aiWidget = document.getElementById('ai-assistant-widget');
    if (aiWidget) {
      aiWidget.style.display = role === 'admin' ? 'block' : 'none';
    }

    // Fetch role-specific dataset from Supabase LAST
    try {
      await dataStore.syncAllFromSupabase();
      
      // Re-render the current view now that data has arrived
      if (window.app) {
        window.app.renderCurrentView();
      }
    } catch (e) {
      console.error("syncAllFromSupabase CRASHED:", e);
    }
  } else {
    window.__dairyAppCurrentUser = null;
    stopDriverTracking();
    if (appRoot) appRoot.style.display = 'none';
    if (authContainer) authContainer.style.display = 'flex';
  }
}

let driverWatchId = null;

function stopDriverTracking() {
  if (driverWatchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(driverWatchId);
    driverWatchId = null;
  }
}

function startDriverTracking(driverId) {
  stopDriverTracking();
  
  if (!navigator.geolocation) {
    console.warn("Geolocation is not supported by this browser.");
    return;
  }
  
  driverWatchId = navigator.geolocation.watchPosition(async (position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    try {
      const { driverTrackingRepository } = await import('./repositories/index.js');
      await driverTrackingRepository.updateLocation(driverId, lat, lng);
    } catch(e) {
      console.warn("Failed to update driver tracking:", e);
    }
  }, (err) => {
    console.warn("Geolocation watch error:", err);
  }, {
    enableHighAccuracy: true,
    maximumAge: 10000,
    timeout: 10000
  });
}

async function initAuthApp() {
  setupAuthUI();
  const session = await authService.getCurrentSession();
  updateUIForSession(session);

  authService.onAuthStateChange((event, session) => {
    updateUIForSession(session);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthApp);
} else {
  initAuthApp();
}
