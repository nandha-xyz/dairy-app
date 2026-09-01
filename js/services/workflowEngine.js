import { storesRepository, productsRepository, requirementsRepository, invoicesRepository, paymentsRepository, ordersRepository } from '../repositories/index.js';
import { getTodayDateString, getDateOffsetString } from '../data/seededData.js';

export const workflowEngine = {
  // Format currency in Indian Rupees ₹
  formatCurrency: (amount) => {
    if (isNaN(amount)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  },

  // Calculate Store Outstanding Balance (Sum of unpaid invoices)
  getStoreOutstandingBalance: (storeId) => {
    const invoices = invoicesRepository.getByStore(storeId);
    return invoices.reduce((sum, inv) => sum + (inv.outstandingAmount || 0), 0);
  },

  // Consolidated Product Requirements for a date
  getConsolidatedRequirements: (dateStr = getTodayDateString()) => {
    const products = productsRepository.getAll();
    const requirements = requirementsRepository.getByDate(dateStr).filter(r => r.status === 'Confirmed' || r.status === 'Draft' || r.status === 'Invoiced' || r.status === 'Delivered');
    const buffers = ordersRepository.getPOBuffers();

    const summaryMap = {};
    products.forEach(p => {
      summaryMap[p.id] = {
        product: p,
        totalRequired: 0,
        confirmedCount: 0,
        actualOrderQty: buffers[`${dateStr}_${p.id}`] !== undefined ? buffers[`${dateStr}_${p.id}`] : 0,
        unit: p.unit,
        purchasePrice: p.purchasePrice,
        estimatedCost: 0
      };
    });

    requirements.forEach(req => {
      req.items.forEach(item => {
        if (summaryMap[item.productId]) {
          summaryMap[item.productId].totalRequired += item.quantity;
          if (req.status === 'Confirmed') {
            summaryMap[item.productId].confirmedCount++;
          }
        }
      });
    });

    // Default actual order quantity to totalRequired if no manual override exists
    return Object.values(summaryMap).map(item => {
      const userBuffer = buffers[`${dateStr}_${item.product.id}`];
      const actualQty = userBuffer !== undefined ? userBuffer : item.totalRequired;
      return {
        ...item,
        actualOrderQty: actualQty,
        estimatedCost: actualQty * item.purchasePrice
      };
    });
  },

  // Get store's requirement for today or previous day's suggestion
  getStoreRequirementForDate: (storeId, dateStr = getTodayDateString()) => {
    const existing = requirementsRepository.getByStoreAndDate(storeId, dateStr);
    if (existing) return existing;

    // Default from yesterday if available
    const prevDateStr = getDateOffsetString(-1);
    const prevReq = requirementsRepository.getByStoreAndDate(storeId, prevDateStr);
    const store = storesRepository.getById(storeId);
    const products = productsRepository.getActive();

    const defaultItems = products.map(p => {
      let qty = 0;
      if (prevReq) {
        const prevItem = prevReq.items.find(i => i.productId === p.id);
        if (prevItem) qty = prevItem.quantity;
      } else if (store.recurringRequirements && store.recurringRequirements[p.id]) {
        qty = store.recurringRequirements[p.id];
      }
      return {
        productId: p.id,
        productName: p.name,
        unit: p.unit,
        rate: p.sellingPrice,
        quantity: qty,
        amount: qty * p.sellingPrice
      };
    });

    const totalAmount = defaultItems.reduce((sum, item) => sum + item.amount, 0);

    return {
      id: `req-${dateStr}-${storeId}`,
      storeId: store.id,
      storeCode: store.code,
      storeName: store.name,
      location: store.location,
      date: dateStr,
      status: 'Pending',
      items: defaultItems,
      totalAmount: totalAmount,
      lastUpdated: 'Not updated yet'
    };
  },

  // Dashboard KPIs
  getDashboardKPIs: (dateStr = getTodayDateString()) => {
    const stores = storesRepository.getAll().filter(s => s.status === 'Active');
    const requirements = requirementsRepository.getByDate(dateStr);
    const invoices = invoicesRepository.getAll();

    const confirmedReqs = requirements.filter(r => r.status === 'Confirmed' || r.status === 'Invoiced' || r.status === 'Delivered');
    const pendingReqs = stores.length - confirmedReqs.length;

    const todayOrderValue = confirmedReqs.reduce((sum, r) => sum + r.totalAmount, 0);
    
    const todayInvoices = invoices.filter(i => i.date === dateStr);
    const todayBillingValue = todayInvoices.reduce((sum, i) => sum + i.grandTotal, 0);

    const totalOutstanding = invoices.reduce((sum, i) => sum + (i.outstandingAmount || 0), 0);

    return {
      totalStoresCount: stores.length,
      requirementsCollected: confirmedReqs.length,
      requirementsPending: pendingReqs,
      todayOrderValue,
      todayBillingValue,
      totalOutstanding
    };
  },

  // Get Store Requirement Status List for Dashboard/Requirements Screen
  getStoreRequirementStatusList: (dateStr = getTodayDateString()) => {
    const stores = storesRepository.getAll().filter(s => s.status === 'Active');
    return stores.map(store => {
      const req = workflowEngine.getStoreRequirementForDate(store.id, dateStr);
      const outstanding = workflowEngine.getStoreOutstandingBalance(store.id);
      return {
        store,
        requirement: req,
        outstanding
      };
    });
  }
};
