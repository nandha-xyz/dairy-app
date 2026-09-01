import { storesRepository, productsRepository, requirementsRepository, paymentsRepository } from '../repositories/index.js';
import { workflowEngine } from './workflowEngine.js';

export const aiAgentEngine = {
  init: () => {
    if (!document.getElementById('ai-agent-hud')) {
      const hudEl = document.createElement('div');
      hudEl.id = 'ai-agent-hud';
      hudEl.className = 'ai-agent-hud';
      hudEl.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <div class="ai-hud-pulse"></div>
          <span id="ai-hud-status-text">⚡ AI Copilot Screen Control Active...</span>
        </div>
        <div style="font-size:0.75rem; background:rgba(255,255,255,0.15); padding:0.25rem 0.6rem; border-radius:4px;">
          2026 Autonomous Agent
        </div>
      `;
      document.body.appendChild(hudEl);
    }

    if (!document.getElementById('ai-toast-container')) {
      const toastContainer = document.createElement('div');
      toastContainer.id = 'ai-toast-container';
      toastContainer.className = 'ai-toast-container';
      document.body.appendChild(toastContainer);
    }
  },

  showHUD: (message) => {
    const hud = document.getElementById('ai-agent-hud');
    const text = document.getElementById('ai-hud-status-text');
    if (hud && text) {
      text.innerText = message;
      hud.classList.add('active');
    }
  },

  hideHUD: () => {
    const hud = document.getElementById('ai-agent-hud');
    if (hud) {
      hud.classList.remove('active');
    }
  },

  showToast: (message, icon = '✨') => {
    const container = document.getElementById('ai-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'ai-toast';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  highlightElement: async (elementOrSelector, durationMs = 800) => {
    const el = typeof elementOrSelector === 'string' 
      ? document.querySelector(elementOrSelector) 
      : elementOrSelector;
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ai-target-glow');
    await new Promise(r => setTimeout(r, durationMs));
    el.classList.remove('ai-target-glow');
  },

  typeText: async (inputElementOrSelector, text, speedMs = 35) => {
    const input = typeof inputElementOrSelector === 'string'
      ? document.querySelector(inputElementOrSelector)
      : inputElementOrSelector;
    if (!input) return;

    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    input.classList.add('ai-target-glow');
    input.focus();
    input.value = '';

    for (let i = 0; i < text.length; i++) {
      input.value += text[i];
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, speedMs));
    }

    await new Promise(r => setTimeout(r, 200));
    input.classList.remove('ai-target-glow');
  },

  // Dispatcher for Screen Takeover Commands
  execute: async (actionPayload, appController) => {
    aiAgentEngine.init();

    try {
      switch (actionPayload.type) {

        // ==========================================
        // ACTION 1: ADD STORE
        // ==========================================
        case 'ADD_STORE': {
          aiAgentEngine.showHUD(`⚡ AI Agent: Navigating to Stores & Opening Add Store Form...`);
          
          if (appController.currentView !== 'stores') {
            appController.currentView = 'stores';
            window.location.hash = 'stores';
            appController.renderCurrentView();
            await new Promise(r => setTimeout(r, 400));
          }

          aiAgentEngine.showHUD(`⚡ AI Agent: Opening Add Store Modal...`);
          const addBtn = document.getElementById('btn-add-store');
          if (addBtn) {
            await aiAgentEngine.highlightElement(addBtn, 500);
            addBtn.click();
            await new Promise(r => setTimeout(r, 400));
          }

          const storeData = actionPayload.data;
          aiAgentEngine.showHUD(`⚡ AI Agent Typing: Store Name "${storeData.name}"...`);
          await aiAgentEngine.typeText('#store-name', storeData.name);

          aiAgentEngine.showHUD(`⚡ AI Agent: Selecting Location "${storeData.location}"...`);
          const locSelect = document.getElementById('store-location');
          if (locSelect) {
            await aiAgentEngine.highlightElement(locSelect, 300);
            locSelect.value = storeData.location;
            locSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }

          aiAgentEngine.showHUD(`⚡ AI Agent Typing: Contact Person "${storeData.contactPerson}"...`);
          await aiAgentEngine.typeText('#store-contact', storeData.contactPerson);

          aiAgentEngine.showHUD(`⚡ AI Agent Typing: Phone "${storeData.phone}"...`);
          await aiAgentEngine.typeText('#store-phone', storeData.phone);

          aiAgentEngine.showHUD(`⚡ AI Agent Typing: Address "${storeData.address}"...`);
          await aiAgentEngine.typeText('#store-address', storeData.address);

          aiAgentEngine.showHUD(`⚡ AI Agent: Submitting New Store Form...`);
          const saveBtn = document.querySelector('#modal-add-store .btn-primary');
          if (saveBtn) {
            await aiAgentEngine.highlightElement(saveBtn, 600);
            saveBtn.click();
          }

          aiAgentEngine.hideHUD();
          aiAgentEngine.showToast(`Successfully created store "${storeData.name}"!`, '🎉');
          break;
        }

        // ==========================================
        // ACTION 2: ADD PRODUCT
        // ==========================================
        case 'ADD_PRODUCT': {
          aiAgentEngine.showHUD(`⚡ AI Agent: Navigating to Products Catalog...`);

          if (appController.currentView !== 'products') {
            appController.currentView = 'products';
            window.location.hash = 'products';
            appController.renderCurrentView();
            await new Promise(r => setTimeout(r, 400));
          }

          aiAgentEngine.showHUD(`⚡ AI Agent: Opening Add Product Modal...`);
          const addBtn = document.getElementById('btn-add-product');
          if (addBtn) {
            await aiAgentEngine.highlightElement(addBtn, 500);
            addBtn.click();
            await new Promise(r => setTimeout(r, 400));
          }

          const prodData = actionPayload.data;
          aiAgentEngine.showHUD(`⚡ AI Agent Typing: Product Name "${prodData.name}"...`);
          await aiAgentEngine.typeText('#product-name', prodData.name);

          const catSelect = document.getElementById('product-category');
          if (catSelect) {
            catSelect.value = prodData.category || 'Milk';
            catSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }

          await aiAgentEngine.typeText('#product-unit', prodData.unit || 'L');
          await aiAgentEngine.typeText('#product-sell-price', String(prodData.sellingPrice || 50));
          await aiAgentEngine.typeText('#product-buy-price', String(prodData.purchasePrice || 40));

          aiAgentEngine.showHUD(`⚡ AI Agent: Saving Product Catalog Item...`);
          const saveBtn = document.querySelector('#modal-add-product .btn-primary');
          if (saveBtn) {
            await aiAgentEngine.highlightElement(saveBtn, 600);
            saveBtn.click();
          }

          aiAgentEngine.hideHUD();
          aiAgentEngine.showToast(`Product "${prodData.name}" added to catalog!`, '🥛');
          break;
        }

        // ==========================================
        // ACTION 3: AUTOFILL ALL PENDING REQUIREMENTS
        // ==========================================
        case 'AUTOFILL_REQUIREMENTS': {
          aiAgentEngine.showHUD(`⚡ AI Agent: Navigating to Daily Requirements & Auto-filling Orders...`);

          if (appController.currentView !== 'requirements') {
            appController.currentView = 'requirements';
            window.location.hash = 'requirements';
            appController.renderCurrentView();
            await new Promise(r => setTimeout(r, 400));
          }

          const dateStr = appController.currentDateStr;
          const storeStatuses = workflowEngine.getStoreRequirementStatusList(dateStr);
          const pendingStores = storeStatuses.filter(s => s.requirement.status === 'Pending');

          for (let i = 0; i < pendingStores.length; i++) {
            const s = pendingStores[i];
            aiAgentEngine.showHUD(`⚡ AI Agent (${i + 1}/${pendingStores.length}): Filling requirement for "${s.store.name}"...`);

            const rowBtn = document.querySelector(`.btn-enter-req[data-store-id="${s.store.id}"]`);
            if (rowBtn) {
              await aiAgentEngine.highlightElement(rowBtn, 400);
            }

            const req = workflowEngine.getStoreRequirementForDate(s.store.id, dateStr);
            req.status = 'Confirmed';
            req.lastUpdated = 'Auto-filled by Autonomous AI Copilot';
            requirementsRepository.save(req);
            await new Promise(r => setTimeout(r, 250));
          }

          appController.renderCurrentView();
          aiAgentEngine.hideHUD();
          aiAgentEngine.showToast(`Auto-filled requirement orders for ${pendingStores.length} stores!`, '⚡');
          break;
        }

        // ==========================================
        // ACTION 4: RECORD PAYMENT
        // ==========================================
        case 'RECORD_PAYMENT': {
          aiAgentEngine.showHUD(`⚡ AI Agent: Navigating to Payments & Opening Record Payment Modal...`);

          if (appController.currentView !== 'payments') {
            appController.currentView = 'payments';
            window.location.hash = 'payments';
            appController.renderCurrentView();
            await new Promise(r => setTimeout(r, 400));
          }

          const addBtn = document.getElementById('btn-record-payment');
          if (addBtn) {
            await aiAgentEngine.highlightElement(addBtn, 500);
            addBtn.click();
            await new Promise(r => setTimeout(r, 400));
          }

          const payData = actionPayload.data;
          const storeSelect = document.getElementById('payment-store-select');
          if (storeSelect && payData.storeId) {
            storeSelect.value = payData.storeId;
            storeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }

          await aiAgentEngine.typeText('#payment-amount', String(payData.amount || 1000));
          await aiAgentEngine.typeText('#payment-ref', payData.referenceNumber || 'UPI-2026-AI');

          const saveBtn = document.querySelector('#modal-record-payment .btn-primary');
          if (saveBtn) {
            await aiAgentEngine.highlightElement(saveBtn, 600);
            saveBtn.click();
          }

          aiAgentEngine.hideHUD();
          aiAgentEngine.showToast(`Payment of ₹${payData.amount} recorded!`, '💳');
          break;
        }

        // ==========================================
        // ACTION 5: NAVIGATE VIEW
        // ==========================================
        case 'NAVIGATE': {
          aiAgentEngine.showHUD(`⚡ AI Agent: Navigating screen to ${actionPayload.targetView.toUpperCase()}...`);
          await new Promise(r => setTimeout(r, 400));
          appController.currentView = actionPayload.targetView;
          window.location.hash = actionPayload.targetView;
          appController.renderCurrentView();
          aiAgentEngine.hideHUD();
          aiAgentEngine.showToast(`Switched view to ${actionPayload.targetView.toUpperCase()}`, '🚀');
          break;
        }

        default:
          aiAgentEngine.hideHUD();
      }
    } catch (err) {
      console.error('AI Agent Engine Execution Error:', err);
      aiAgentEngine.hideHUD();
      aiAgentEngine.showToast('AI Action interrupted', '⚠️');
    }
  }
};
