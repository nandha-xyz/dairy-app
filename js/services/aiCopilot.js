import { workflowEngine } from './workflowEngine.js';
import { storesRepository, requirementsRepository, invoicesRepository, productsRepository } from '../repositories/index.js';

export const aiCopilotService = {
  processQuery: (query, dateStr) => {
    const q = query.toLowerCase().trim();

    // =========================================================================
    // 1. ADD STORE AUTONOMOUS COMMAND
    // =========================================================================
    if (q.includes('add store') || q.includes('create store') || q.includes('new store')) {
      // Extract store name if specified
      let storeName = 'Kovai Gourmet Bakery';
      let location = 'Coimbatore';
      let phone = '9876543210';
      let contactPerson = 'Senthil Kumar';
      let address = '45 Crosscut Road, Gandhipuram, Coimbatore';

      if (q.includes('pollachi')) location = 'Pollachi';
      if (q.includes('tiruppur')) location = 'Tiruppur';
      if (q.includes('erode')) location = 'Erode';

      // Parse custom name if provided after "named" or "called"
      const nameMatch = query.match(/(?:named|called|store)\s+([A-Za-z0-9\s]+?)(?:\s+in|\s+with|\s+phone|$)/i);
      if (nameMatch && nameMatch[1] && nameMatch[1].trim().length > 2) {
        storeName = nameMatch[1].trim();
      }

      return {
        type: 'agent_action',
        message: `🤖 **Autonomous AI Agent Initialized!**\n\nI am taking control of your screen to create a new distribution store profile:\n• **Store Name:** ${storeName}\n• **Location:** ${location}\n• **Contact:** ${contactPerson} (${phone})`,
        action: {
          type: 'ADD_STORE',
          data: {
            name: storeName,
            location: location,
            contactPerson: contactPerson,
            phone: phone,
            address: address
          }
        }
      };
    }

    // =========================================================================
    // 2. ADD PRODUCT AUTONOMOUS COMMAND
    // =========================================================================
    if (q.includes('add product') || q.includes('create product') || q.includes('new product')) {
      let prodName = 'Farm Fresh Paneer 200g';
      let category = 'Milk Products';
      let sellingPrice = 120;
      let purchasePrice = 95;
      let unit = 'Pkt';

      if (q.includes('butter')) { prodName = 'Artisanal White Butter 500g'; category = 'Cheese & Butter'; sellingPrice = 280; purchasePrice = 220; }
      if (q.includes('ghee')) { prodName = 'Pure Vedic Cow Ghee 500ml'; category = 'Cheese & Butter'; sellingPrice = 450; purchasePrice = 360; }
      if (q.includes('curd')) { prodName = 'Thick Set Curd Bucket 1Kg'; category = 'Curd & Yogurt'; sellingPrice = 90; purchasePrice = 70; }

      return {
        type: 'agent_action',
        message: `🤖 **Autonomous AI Agent Initialized!**\n\nI am taking control of your screen to add a new product to your inventory catalog:\n• **Product Name:** ${prodName}\n• **Category:** ${category}\n• **Selling Price:** ₹${sellingPrice} / ${unit}`,
        action: {
          type: 'ADD_PRODUCT',
          data: {
            name: prodName,
            category: category,
            sellingPrice: sellingPrice,
            purchasePrice: purchasePrice,
            unit: unit
          }
        }
      };
    }

    // =========================================================================
    // 3. AUTO-FILL ALL PENDING STORE REQUIREMENTS
    // =========================================================================
    if (q.includes('autofill') || q.includes('auto fill') || q.includes('fill all') || q.includes('take control') || q.includes('do it')) {
      const storeStatuses = workflowEngine.getStoreRequirementStatusList(dateStr);
      const pendingStores = storeStatuses.filter(s => s.requirement.status === 'Pending');

      if (pendingStores.length === 0) {
        return { type: 'text', message: '🎉 All 20 store requirement orders are already confirmed for today!' };
      }

      return {
        type: 'agent_action',
        message: `🤖 **Autonomous AI Agent Active!**\n\nTaking control of screen to auto-fill daily requirement entries for **${pendingStores.length} pending stores** based on previous order patterns.`,
        action: {
          type: 'AUTOFILL_REQUIREMENTS'
        }
      };
    }

    // =========================================================================
    // 4. RECORD PAYMENT COMMAND
    // =========================================================================
    if (q.includes('record payment') || q.includes('collect payment') || q.includes('add payment')) {
      const stores = storesRepository.getAll();
      const targetStore = stores[0]; // Default to first store or match name

      return {
        type: 'agent_action',
        message: `🤖 **Autonomous AI Agent Active!**\n\nTaking control of screen to record payment receipt of **₹5,000 via UPI** for ${targetStore.name}.`,
        action: {
          type: 'RECORD_PAYMENT',
          data: {
            storeId: targetStore.id,
            amount: 5000,
            referenceNumber: `UPI-2026-AI-${Math.floor(1000 + Math.random() * 9000)}`
          }
        }
      };
    }

    // =========================================================================
    // 5. SCREEN NAVIGATION COMMANDS
    // =========================================================================
    if (q.includes('go to') || q.includes('open view') || q.includes('show view') || q.includes('navigate')) {
      let targetView = 'dashboard';
      if (q.includes('store')) targetView = 'stores';
      if (q.includes('order') || q.includes('po')) targetView = 'orders';
      if (q.includes('req')) targetView = 'requirements';
      if (q.includes('invoice')) targetView = 'invoices';
      if (q.includes('payment')) targetView = 'payments';
      if (q.includes('product')) targetView = 'products';

      return {
        type: 'agent_action',
        message: `🤖 **Autonomous Screen Navigation:** Switching screen to **${targetView.toUpperCase()}** view live...`,
        action: {
          type: 'NAVIGATE',
          targetView: targetView
        }
      };
    }

    // =========================================================================
    // 6. PENDING / MISSED STORES QUERY
    // =========================================================================
    if (q.includes('pending') || q.includes('missed') || q.includes('who') || q.includes('not ordered') || q.includes('not submitted')) {
      const storeStatuses = workflowEngine.getStoreRequirementStatusList(dateStr);
      const pendingStores = storeStatuses.filter(s => s.requirement.status === 'Pending');

      if (pendingStores.length === 0) {
        return {
          type: 'text',
          message: `🎉 Great news! All **${storeStatuses.length} stores** have submitted their requirements for today (${dateStr}). No pending stores remaining!`
        };
      }

      const listHtml = pendingStores.map(s => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:white; padding:0.6rem 0.85rem; border-radius:6px; margin-top:0.4rem; border:1px solid #E2E8F0;">
          <div>
            <strong>${s.store.name}</strong> <span style="font-size:0.75rem; color:#64748B;">(${s.store.location})</span>
            <div style="font-size:0.75rem; color:#94A3B8;">Contact: ${s.store.contactPerson} • ${s.store.phone}</div>
          </div>
          <button class="btn btn-primary btn-sm btn-enter-req" data-store-id="${s.store.id}" style="font-size:0.75rem;">Enter Req</button>
        </div>
      `).join('');

      return {
        type: 'html',
        message: `⚠️ **${pendingStores.length} stores** have not submitted requirements for **${dateStr}** yet:
        ${listHtml}
        <div style="margin-top:0.75rem;">
          <button class="btn btn-success btn-sm" id="ai-btn-autofill-all" style="width:100%;">⚡ Auto-Fill Yesterday's Orders for All Pending Stores</button>
        </div>`
      };
    }

    // =========================================================================
    // 7. PRODUCT DEMAND / PROCUREMENT QUERY
    // =========================================================================
    if (q.includes('demand') || q.includes('purchase order') || q.includes('milk') || q.includes('procurement') || q.includes('qty')) {
      const consolidated = workflowEngine.getConsolidatedRequirements(dateStr);
      const totalCost = consolidated.reduce((sum, item) => sum + item.estimatedCost, 0);

      const itemsList = consolidated.map(i => `
        <div style="display:flex; justify-content:space-between; padding:0.3rem 0; border-bottom:1px solid #F1F5F9; font-size:0.85rem;">
          <span><strong>${i.product.name}:</strong></span>
          <span><strong style="color:#2563EB;">${i.totalRequired} ${i.unit}</strong> (Est. ₹${i.estimatedCost})</span>
        </div>
      `).join('');

      return {
        type: 'html',
        message: `🥛 **Consolidated Demand Summary for ${dateStr}:**
        <div style="background:white; padding:0.75rem; border-radius:6px; margin:0.5rem 0; border:1px solid #E2E8F0;">
          ${itemsList}
          <div style="display:flex; justify-content:space-between; font-weight:700; margin-top:0.5rem; color:#2563EB; font-size:0.9rem;">
            <span>Total Procurement Cost:</span>
            <span>${workflowEngine.formatCurrency(totalCost)}</span>
          </div>
        </div>
        <a href="#orders" class="btn btn-secondary btn-sm" style="display:block; text-align:center; text-decoration:none;">View Purchase Order Page →</a>`
      };
    }

    // =========================================================================
    // 8. OUTSTANDING BALANCE QUERY
    // =========================================================================
    if (q.includes('overdue') || q.includes('outstanding') || q.includes('unpaid') || q.includes('balance')) {
      const stores = storesRepository.getAll();
      const debtorStores = stores.map(store => {
        const bal = workflowEngine.getStoreOutstandingBalance(store.id);
        return { store, balance: bal };
      }).filter(s => s.balance > 0).sort((a, b) => b.balance - a.balance);

      if (debtorStores.length === 0) {
        return { type: 'text', message: '🎉 Outstanding balance is ₹0! All store accounts are fully paid.' };
      }

      const listHtml = debtorStores.slice(0, 5).map(s => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:white; padding:0.5rem 0.75rem; border-radius:6px; margin-top:0.35rem; border:1px solid #E2E8F0; font-size:0.85rem;">
          <div>
            <strong>${s.store.name}</strong>
          </div>
          <span style="font-weight:700; color:#DC2626;">${workflowEngine.formatCurrency(s.balance)}</span>
        </div>
      `).join('');

      const totalOverdue = debtorStores.reduce((sum, s) => sum + s.balance, 0);

      return {
        type: 'html',
        message: `💳 **Top Outstanding Balances (${debtorStores.length} Stores Total: ${workflowEngine.formatCurrency(totalOverdue)}):**
        ${listHtml}
        <div style="margin-top:0.75rem;">
          <a href="#payments" class="btn btn-primary btn-sm" style="display:block; text-align:center; text-decoration:none;">Open Payments Management →</a>
        </div>`
      };
    }

    // =========================================================================
    // 9. LIVE DRIVER LOCATION / FLEET TRACKING QUERY
    // =========================================================================
    if (q.includes('driver') || q.includes('truck') || q.includes('where') || q.includes('location') || q.includes('track') || q.includes('gps')) {
      return {
        type: 'html',
        message: `🚚 **Live Fleet GPS Tracking:**\n\nI have located the active delivery vehicles. Taking you to the live Store Geolocation Map now...\n\n<div style="margin-top:0.75rem;"><a href="#store-map" class="btn btn-primary btn-sm" style="display:block; text-align:center; text-decoration:none;">📍 Open Live Geolocation Map →</a></div>`,
        action: {
          type: 'NAVIGATE',
          targetView: 'store-map'
        }
      };
    }

    // =========================================================================
    // DEFAULT 2026 AGENTIC RESPONSE WITH ACTIVE CHIPS
    // =========================================================================
    return {
      type: 'html',
      message: `🤖 **I am your 2026 Autonomous AI Copilot.**\n\nI don't just answer questions—I can **take control of your screen and perform operations live** for you!\n\n**Try an Autonomous Screen Takeover:**\n• <button class="btn btn-secondary btn-sm ai-chip-btn" data-query="Auto fill missing store requirements" style="margin-top:0.3rem;">⚡ "Auto-fill missing store requirements"</button>\n• <button class="btn btn-secondary btn-sm ai-chip-btn" data-query="Add a store named Kovai Gourmet in Pollachi" style="margin-top:0.3rem;">➕ "Add store named Kovai Gourmet"</button>\n• <button class="btn btn-secondary btn-sm ai-chip-btn" data-query="Add product Paneer 200g" style="margin-top:0.3rem;">🥛 "Add new product Paneer 200g"</button>\n• <button class="btn btn-secondary btn-sm ai-chip-btn" data-query="Record payment 5000" style="margin-top:0.3rem;">💳 "Record ₹5,000 payment"</button>`
    };
  }
};
