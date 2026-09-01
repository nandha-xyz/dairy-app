import { getTodayDateString } from './data/seededData.js';
import { storesRepository, productsRepository, paymentsRepository, requirementsRepository, dataStore } from './repositories/index.js';
import { workflowEngine } from './services/workflowEngine.js';
import { aiCopilotService } from './services/aiCopilot.js';
import { aiAgentEngine } from './services/aiAgentEngine.js';
import { authService } from './services/authService.js';

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

class AppController {
  constructor() {
    this.currentDate = getTodayDateString();
    this.currentView = 'dashboard';
    this.selectedStoreId = null;
    this.selectedInvoiceId = null;
    this.activeStoreTab = 'overview';
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
  }

  handleNavigation() {
    const hash = window.location.hash.substring(1) || 'dashboard';
    const parts = hash.split('/');
    this.currentView = parts[0];

    if (parts[0] === 'store-detail' && parts[1]) {
      this.selectedStoreId = parts[1];
    }
    if (parts[0] === 'invoice-detail' && parts[1]) {
      this.selectedInvoiceId = parts[1];
    }

    // Bind sidebar collapse toggle button
    const collapseBtn = document.getElementById('btn-toggle-sidebar-collapse');
    const appRoot = document.getElementById('app-root');
    if (collapseBtn && appRoot) {
      collapseBtn.addEventListener('click', () => {
        appRoot.classList.toggle('sidebar-collapsed');
        const isCollapsed = appRoot.classList.contains('sidebar-collapsed');
        collapseBtn.textContent = isCollapsed ? '▶' : '◀';
      });
    }

    // Mobile slide-out sidebar overlay
    const mobileToggle = document.getElementById('btn-toggle-sidebar');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    const toggleMobileMenu = () => {
      if (sidebar && sidebarOverlay) {
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('open');
      }
    };

    if (mobileToggle) {
      mobileToggle.addEventListener('click', toggleMobileMenu);
    }
    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', toggleMobileMenu);
    }

    // Update sidebar & mobile bottom nav active links
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
        subtitleElem.textContent = 'Business preferences & demo data control';
        viewport.innerHTML = settingsView.render();
        this.bindSettingsEvents();
        break;

      default:
        viewport.innerHTML = dashboardView.render(this.currentDate);
    }
  }

  bindGlobalEvents() {
    document.addEventListener('click', (e) => {
      // Enter requirement drawer trigger
      const reqBtn = e.target.closest('.btn-enter-req');
      if (reqBtn) {
        const storeId = reqBtn.dataset.storeId;
        this.openRequirementDrawer(storeId);
      }

      // View pending stores shortcut
      if (e.target.id === 'btn-view-pending') {
        window.location.hash = '#requirements';
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
    });

    // Form submission handlers
    document.addEventListener('submit', (e) => {
      if (e.target.id === 'payment-form') {
        e.preventDefault();
        const formData = new FormData(e.target);
        const paymentData = {
          invoiceId: formData.get('invoiceId'),
          storeId: formData.get('storeId'),
          storeName: formData.get('storeName'),
          amount: parseFloat(formData.get('amount')) || 0,
          date: formData.get('date'),
          method: formData.get('method'),
          referenceNumber: formData.get('referenceNumber'),
          notes: formData.get('notes')
        };

        paymentsRepository.recordPayment(paymentData);
        this.closeModal();
        this.renderCurrentView();
      }

      if (e.target.id === 'add-store-form') {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newStore = {
          id: `s-${Date.now()}`,
          code: `STR-${formData.get('location').substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
          name: formData.get('name'),
          location: formData.get('location'),
          contactPerson: formData.get('contactPerson'),
          phone: formData.get('phone'),
          status: 'Active',
          address: formData.get('address'),
          recurringRequirements: {}
        };
        storesRepository.save(newStore);
        this.closeModal();
        this.renderCurrentView();
      }

      if (e.target.id === 'add-product-form') {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newProd = {
          id: `p-${Date.now()}`,
          sku: `PRD-${formData.get('name').substring(0, 3).toUpperCase()}-0${Math.floor(1 + Math.random() * 9)}`,
          name: formData.get('name'),
          category: formData.get('category'),
          unit: formData.get('unit'),
          sellingPrice: parseFloat(formData.get('sellingPrice')) || 0,
          purchasePrice: parseFloat(formData.get('purchasePrice')) || 0,
          taxPercent: parseFloat(formData.get('taxPercent')) || 0,
          active: true
        };
        productsRepository.save(newProd);
        this.closeModal();
        this.renderCurrentView();
      }
    });
  }

  autoFillAllPendingStores() {
    const storeStatuses = workflowEngine.getStoreRequirementStatusList(this.currentDate);
    const pendingStores = storeStatuses.filter(s => s.requirement.status === 'Pending');

    if (pendingStores.length === 0) {
      alert('All stores have already submitted requirements today!');
      return;
    }

    if (confirm(`Auto-fill requirements for ${pendingStores.length} pending stores using previous day's orders?`)) {
      pendingStores.forEach(s => {
        const req = workflowEngine.getStoreRequirementForDate(s.store.id, this.currentDate);
        req.status = 'Confirmed';
        req.lastUpdated = 'Auto-filled by Admin';
        requirementsRepository.save(req);
      });

      this.renderCurrentView();
    }
  }

  bindAICopilot() {
    const toggleBtn = document.getElementById('btn-toggle-ai-chat');
    const closeBtn = document.getElementById('btn-close-ai-chat');
    const chatWindow = document.getElementById('ai-chat-window');
    const sendBtn = document.getElementById('btn-send-ai-message');
    const chatInput = document.getElementById('ai-chat-input');
    const chatMessages = document.getElementById('ai-chat-messages');

    if (!toggleBtn || !chatWindow) return;

    const toggleChat = () => {
      const isVisible = window.getComputedStyle(chatWindow).display !== 'none';
      chatWindow.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible) chatInput?.focus();
    };

    toggleBtn.addEventListener('click', toggleChat);

    closeBtn?.addEventListener('click', () => {
      chatWindow.style.display = 'none';
    });

    const submitUserQuery = (queryText) => {
      if (!queryText.trim()) return;

      // Append User message bubble
      const userMsgDiv = document.createElement('div');
      userMsgDiv.className = 'ai-msg user';
      userMsgDiv.style.cssText = 'align-self: flex-end; background: var(--accent-primary); color: white; padding: 0.7rem 0.9rem; border-radius: 12px 12px 0 12px; font-size: 0.85rem; max-width: 85%;';
      userMsgDiv.textContent = queryText;
      chatMessages.appendChild(userMsgDiv);

      chatInput.value = '';
      chatMessages.scrollTop = chatMessages.scrollHeight;

      // Process query via aiCopilotService
      setTimeout(async () => {
        const response = aiCopilotService.processQuery(queryText, this.currentDate);
        const botMsgDiv = document.createElement('div');
        botMsgDiv.className = 'ai-msg bot';
        botMsgDiv.style.cssText = 'align-self: flex-start; background: white; border: 1px solid #E2E8F0; padding: 0.85rem; border-radius: 12px 12px 12px 0; font-size: 0.85rem; color: var(--text-primary); max-width: 90%; line-height:1.45; box-shadow:0 2px 8px rgba(0,0,0,0.05);';

        if (response.type === 'html' || response.type === 'agent_action') {
          botMsgDiv.innerHTML = response.message.replace(/\n/g, '<br>');
        } else {
          botMsgDiv.innerText = response.message;
        }

        chatMessages.appendChild(botMsgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // If the AI response contains an Autonomous Screen Control action payload, execute it!
        if (response.action) {
          await aiAgentEngine.execute(response.action, this);
        }
      }, 300);
    };

    sendBtn?.addEventListener('click', () => submitUserQuery(chatInput.value));

    chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        submitUserQuery(chatInput.value);
      }
    });

    // Chip prompt triggers
    document.querySelectorAll('.ai-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.dataset.prompt;
        submitUserQuery(prompt);
      });
    });

    // Delegated click for dynamic action chip buttons in bot responses
    chatMessages.addEventListener('click', (e) => {
      const chipBtn = e.target.closest('.ai-chip-btn');
      if (chipBtn && chipBtn.dataset.query) {
        submitUserQuery(chipBtn.dataset.query);
      }
    });
  }

  openRequirementDrawer(storeId) {
    const drawer = document.getElementById('requirement-drawer');
    const backdrop = document.getElementById('modal-backdrop');
    drawer.innerHTML = requirementEntryView.renderDrawerContent(storeId, this.currentDate);
    drawer.classList.add('open');
    backdrop.classList.add('open');

    requirementEntryView.bindEvents(storeId, this.currentDate, () => {
      this.renderCurrentView();
    });
  }

  openRecordPaymentModal(invoiceId) {
    const backdrop = document.getElementById('modal-backdrop');
    backdrop.innerHTML = paymentsView.renderRecordPaymentModal(invoiceId);
    backdrop.classList.add('open');
  }

  openAddStoreModal() {
    const backdrop = document.getElementById('modal-backdrop');
    backdrop.innerHTML = `
      <div class="modal-card">
        <h3 style="font-size:1.2rem; font-weight:800; margin-bottom:1rem;">Add New Retail Store</h3>
        <form id="add-store-form">
          <div class="form-group">
            <label class="form-label">Store Name</label>
            <input type="text" name="name" class="form-input" required placeholder="e.g. Fresh Dairy Express" />
          </div>
          <div class="form-group">
            <label class="form-label">Location / City</label>
            <select name="location" class="form-select" required>
              <option value="Coimbatore">Coimbatore</option>
              <option value="Pollachi">Pollachi</option>
              <option value="Tiruppur">Tiruppur</option>
              <option value="Erode">Erode</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Contact Person</label>
            <input type="text" name="contactPerson" class="form-input" required placeholder="Contact name" />
          </div>
          <div class="form-group">
            <label class="form-label">Phone Number</label>
            <input type="text" name="phone" class="form-input" required placeholder="+91 98421 00000" />
          </div>
          <div class="form-group">
            <label class="form-label">Store Address</label>
            <input type="text" name="address" class="form-input" required placeholder="Street address, landmark" />
          </div>
          <div style="display:flex; justify-content:flex-end; gap:0.75rem; margin-top:1.5rem;">
            <button type="button" class="btn btn-secondary" id="btn-cancel-modal">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Store</button>
          </div>
        </form>
      </div>
    `;
    backdrop.classList.add('open');
  }

  openAddProductModal() {
    const backdrop = document.getElementById('modal-backdrop');
    backdrop.innerHTML = `
      <div class="modal-card">
        <h3 style="font-size:1.2rem; font-weight:800; margin-bottom:1rem;">Add New Dairy Product</h3>
        <form id="add-product-form">
          <div class="form-group">
            <label class="form-label">Product Name</label>
            <input type="text" name="name" class="form-input" required placeholder="e.g. Fresh Buffalo Curd" />
          </div>
          <div class="form-group">
            <label class="form-label">Category</label>
            <select name="category" class="form-select">
              <option value="Milk">Milk</option>
              <option value="Curd">Curd</option>
              <option value="Paneer">Paneer</option>
              <option value="Cheese">Cheese</option>
              <option value="Beverages">Beverages</option>
              <option value="Ghee">Ghee</option>
              <option value="Cream">Cream</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Unit</label>
            <select name="unit" class="form-select">
              <option value="Litre">Litre</option>
              <option value="Kilogram">Kilogram</option>
              <option value="Packet">Packet</option>
              <option value="Box">Box</option>
              <option value="Piece">Piece</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Selling Price (₹)</label>
            <input type="number" name="sellingPrice" class="form-input" required min="1" step="0.5" />
          </div>
          <div class="form-group">
            <label class="form-label">Purchase Cost Price (₹)</label>
            <input type="number" name="purchasePrice" class="form-input" required min="1" step="0.5" />
          </div>
          <div class="form-group">
            <label class="form-label">Tax (GST %)</label>
            <input type="number" name="taxPercent" class="form-input" value="0" min="0" max="28" />
          </div>
          <div style="display:flex; justify-content:flex-end; gap:0.75rem; margin-top:1.5rem;">
            <button type="button" class="btn btn-secondary" id="btn-cancel-modal">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Product</button>
          </div>
        </form>
      </div>
    `;
    backdrop.classList.add('open');
  }

  closeModal() {
    const backdrop = document.getElementById('modal-backdrop');
    backdrop.classList.remove('open');
    backdrop.innerHTML = '';
  }

  bindRequirementsEvents() {
    const locFilter = document.getElementById('req-location-filter');
    const statFilter = document.getElementById('req-status-filter');

    if (locFilter && statFilter) {
      const updateReqs = () => {
        const viewport = document.getElementById('app-viewport');
        viewport.innerHTML = requirementsView.render(this.currentDate, statFilter.value, locFilter.value);
        this.bindRequirementsEvents();
      };
      locFilter.addEventListener('change', updateReqs);
      statFilter.addEventListener('change', updateReqs);
    }
  }

  bindSettingsEvents() {
    document.getElementById('btn-reset-demo-data')?.addEventListener('click', () => {
      if (confirm('Reset demo database back to initial seed data?')) {
        localStorage.clear();
        window.location.reload();
      }
    });
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
  const userAvatarBadge = document.getElementById('user-avatar-badge');

  if (session && session.user) {
    if (authContainer) authContainer.style.display = 'none';
    if (appRoot) appRoot.style.display = 'flex';

    const userEmail = session.user.email || 'Admin';
    if (userEmailDisplay) userEmailDisplay.textContent = userEmail;
    if (userAvatarBadge) userAvatarBadge.textContent = userEmail.substring(0, 2).toUpperCase();

    // Fetch user-owned data from Supabase
    await dataStore.syncAllFromSupabase();

    if (!window.app) {
      window.app = new AppController();
    } else {
      window.app.renderCurrentView();
    }
  } else {
    if (appRoot) appRoot.style.display = 'none';
    if (authContainer) authContainer.style.display = 'flex';
  }
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

