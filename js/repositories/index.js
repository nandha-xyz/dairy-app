import { SEEDED_STORES, SEEDED_PRODUCTS, generateInitialHistory, getTodayDateString } from '../data/seededData.js';

const STORAGE_KEYS = {
  STORES: 'dairy_app_stores_v1',
  PRODUCTS: 'dairy_app_products_v1',
  REQUIREMENTS: 'dairy_app_requirements_v1',
  INVOICES: 'dairy_app_invoices_v1',
  PAYMENTS: 'dairy_app_payments_v1',
  PO_BUFFERS: 'dairy_app_po_buffers_v1'
};

class SafeStorage {
  constructor() {
    this.memoryStore = {};
  }
  getItem(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch(e) {}
    return this.memoryStore[key] || null;
  }
  setItem(key, value) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch(e) {}
    this.memoryStore[key] = value;
  }
  clear() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch(e) {}
    this.memoryStore = {};
  }
}

const safeStorage = new SafeStorage();

class DataStore {
  constructor() {
    this.init();
  }

  init() {
    try {
      const todayStr = getTodayDateString();
      let stores = safeStorage.getItem(STORAGE_KEYS.STORES);
      if (!stores) {
        safeStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(SEEDED_STORES));
      }
      let products = safeStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (!products) {
        safeStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(SEEDED_PRODUCTS));
      }

      const existingReqsRaw = safeStorage.getItem(STORAGE_KEYS.REQUIREMENTS);
      let existingReqs = existingReqsRaw ? JSON.parse(existingReqsRaw) : [];
      
      const hasTodayData = existingReqs.some(r => r.date === todayStr);

      if (!existingReqsRaw || !hasTodayData) {
        const { requirements, invoices, payments } = generateInitialHistory();
        safeStorage.setItem(STORAGE_KEYS.REQUIREMENTS, JSON.stringify(requirements));
        safeStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
        safeStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
      }

      if (!safeStorage.getItem(STORAGE_KEYS.PO_BUFFERS)) {
        safeStorage.setItem(STORAGE_KEYS.PO_BUFFERS, JSON.stringify({}));
      }
    } catch (e) {
      console.error('DataStore init error:', e);
    }
  }

  get(key) {
    try {
      return JSON.parse(safeStorage.getItem(key) || '[]');
    } catch(e) {
      return [];
    }
  }

  set(key, data) {
    safeStorage.setItem(key, JSON.stringify(data));
  }
}

const db = new DataStore();

// Stores Repository
export const storesRepository = {
  getAll: () => db.get(STORAGE_KEYS.STORES),
  getById: (id) => db.get(STORAGE_KEYS.STORES).find(s => s.id === id),
  save: (store) => {
    const stores = db.get(STORAGE_KEYS.STORES);
    const idx = stores.findIndex(s => s.id === store.id);
    if (idx >= 0) stores[idx] = store;
    else stores.unshift(store);
    db.set(STORAGE_KEYS.STORES, stores);
    return store;
  }
};

// Products Repository
export const productsRepository = {
  getAll: () => db.get(STORAGE_KEYS.PRODUCTS),
  getActive: () => db.get(STORAGE_KEYS.PRODUCTS).filter(p => p.active),
  getById: (id) => db.get(STORAGE_KEYS.PRODUCTS).find(p => p.id === id),
  save: (product) => {
    const products = db.get(STORAGE_KEYS.PRODUCTS);
    const idx = products.findIndex(p => p.id === product.id);
    if (idx >= 0) products[idx] = product;
    else products.unshift(product);
    db.set(STORAGE_KEYS.PRODUCTS, products);
    return product;
  }
};

// Daily Requirements Repository
export const requirementsRepository = {
  getAll: () => db.get(STORAGE_KEYS.REQUIREMENTS),
  getByDate: (dateStr) => db.get(STORAGE_KEYS.REQUIREMENTS).filter(r => r.date === dateStr),
  getByStoreAndDate: (storeId, dateStr) => db.get(STORAGE_KEYS.REQUIREMENTS).find(r => r.storeId === storeId && r.date === dateStr),
  getByStore: (storeId) => db.get(STORAGE_KEYS.REQUIREMENTS).filter(r => r.storeId === storeId),
  save: (requirement) => {
    const requirements = db.get(STORAGE_KEYS.REQUIREMENTS);
    const idx = requirements.findIndex(r => r.id === requirement.id);
    if (idx >= 0) requirements[idx] = requirement;
    else requirements.unshift(requirement);
    db.set(STORAGE_KEYS.REQUIREMENTS, requirements);

    // Dynamic reactive trigger: if confirmed, update or generate invoice!
    if (requirement.status === 'Confirmed') {
      invoicesRepository.syncInvoiceFromRequirement(requirement);
    }
    return requirement;
  }
};

// Invoices Repository
export const invoicesRepository = {
  getAll: () => db.get(STORAGE_KEYS.INVOICES),
  getById: (id) => db.get(STORAGE_KEYS.INVOICES).find(i => i.id === id),
  getByStore: (storeId) => db.get(STORAGE_KEYS.INVOICES).filter(i => i.storeId === storeId),
  getByDate: (dateStr) => db.get(STORAGE_KEYS.INVOICES).filter(i => i.date === dateStr),
  
  syncInvoiceFromRequirement: (requirement) => {
    const invoices = db.get(STORAGE_KEYS.INVOICES);
    let inv = invoices.find(i => i.requirementId === requirement.id);
    
    const subtotal = requirement.totalAmount;
    const tax = Math.round(subtotal * 0.02);
    const grandTotal = subtotal + tax;

    if (inv) {
      inv.items = requirement.items;
      inv.subtotal = subtotal;
      inv.tax = tax;
      inv.grandTotal = grandTotal;
      inv.outstandingAmount = grandTotal - inv.paidAmount;
      if (inv.outstandingAmount <= 0) inv.status = 'Paid';
    } else {
      const invNumber = `INV-${requirement.date.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      inv = {
        id: `inv-${requirement.id}`,
        invoiceNumber: invNumber,
        requirementId: requirement.id,
        storeId: requirement.storeId,
        storeName: requirement.storeName,
        location: requirement.location,
        date: requirement.date,
        dueDate: requirement.date,
        items: requirement.items,
        subtotal: subtotal,
        tax: tax,
        discount: 0,
        grandTotal: grandTotal,
        paidAmount: 0,
        outstandingAmount: grandTotal,
        status: 'Generated'
      };
      invoices.unshift(inv);
    }
    db.set(STORAGE_KEYS.INVOICES, invoices);
    return inv;
  },

  save: (invoice) => {
    const invoices = db.get(STORAGE_KEYS.INVOICES);
    const idx = invoices.findIndex(i => i.id === invoice.id);
    if (idx >= 0) invoices[idx] = invoice;
    else invoices.unshift(invoice);
    db.set(STORAGE_KEYS.INVOICES, invoices);
    return invoice;
  }
};

// Payments Repository
export const paymentsRepository = {
  getAll: () => db.get(STORAGE_KEYS.PAYMENTS),
  getByStore: (storeId) => db.get(STORAGE_KEYS.PAYMENTS).filter(p => p.storeId === storeId),
  getByInvoice: (invoiceId) => db.get(STORAGE_KEYS.PAYMENTS).filter(p => p.invoiceId === invoiceId),
  
  recordPayment: (paymentData) => {
    const payments = db.get(STORAGE_KEYS.PAYMENTS);
    const newPayment = {
      id: `pay-${Date.now()}`,
      ...paymentData
    };
    payments.unshift(newPayment);
    db.set(STORAGE_KEYS.PAYMENTS, payments);

    // Update corresponding invoice
    const invoice = invoicesRepository.getById(paymentData.invoiceId);
    if (invoice) {
      invoice.paidAmount += paymentData.amount;
      invoice.outstandingAmount = Math.max(0, invoice.grandTotal - invoice.paidAmount);
      if (invoice.outstandingAmount === 0) {
        invoice.status = 'Paid';
      } else {
        invoice.status = 'Partially Paid';
      }
      invoicesRepository.save(invoice);
    }

    return newPayment;
  }
};

// PO Buffer Settings & Order Status Repository
export const ordersRepository = {
  getPOBuffers: () => {
    try {
      return JSON.parse(safeStorage.getItem(STORAGE_KEYS.PO_BUFFERS) || '{}');
    } catch(e) { return {}; }
  },
  setPOBuffer: (productId, actualQty) => {
    const buffers = ordersRepository.getPOBuffers();
    buffers[productId] = actualQty;
    safeStorage.setItem(STORAGE_KEYS.PO_BUFFERS, JSON.stringify(buffers));
  },
  getByDate: (dateStr) => {
    try {
      const pos = JSON.parse(safeStorage.getItem('dairy_app_po_records_v1') || '{}');
      return pos[dateStr] || null;
    } catch(e) { return null; }
  },
  savePO: (poRecord) => {
    let pos = {};
    try {
      pos = JSON.parse(safeStorage.getItem('dairy_app_po_records_v1') || '{}');
    } catch(e) {}
    pos[poRecord.date] = poRecord;
    safeStorage.setItem('dairy_app_po_records_v1', JSON.stringify(pos));
    return poRecord;
  }
};
