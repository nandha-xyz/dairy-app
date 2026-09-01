import { supabase } from '../services/supabaseClient.js';

const STORAGE_KEYS = {
  STORES: 'dairy_app_stores_v2',
  PRODUCTS: 'dairy_app_products_v2',
  REQUIREMENTS: 'dairy_app_requirements_v2',
  INVOICES: 'dairy_app_invoices_v2',
  PAYMENTS: 'dairy_app_payments_v2',
  PO_BUFFERS: 'dairy_app_po_buffers_v2',
  POS: 'dairy_app_po_records_v2'
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

// Data Transformers between JS domain models (camelCase) and Supabase tables (snake_case)
const Mappers = {
  storeToDb: (s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    location: s.location || null,
    contact_person: s.contactPerson || null,
    phone: s.phone || null,
    status: s.status || 'Active',
    address: s.address || null,
    recurring_requirements: s.recurringRequirements || {}
  }),
  storeFromDb: (r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    location: r.location || '',
    contactPerson: r.contact_person || '',
    phone: r.phone || '',
    status: r.status || 'Active',
    address: r.address || '',
    recurringRequirements: r.recurring_requirements || {}
  }),

  productToDb: (p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    category: p.category || null,
    unit: p.unit || null,
    selling_price: p.sellingPrice || 0,
    purchase_price: p.purchasePrice || 0,
    tax_percent: p.taxPercent || 0,
    active: p.active !== false
  }),
  productFromDb: (r) => ({
    id: r.id,
    sku: r.sku,
    name: r.name,
    category: r.category || '',
    unit: r.unit || '',
    sellingPrice: Number(r.selling_price || 0),
    purchasePrice: Number(r.purchase_price || 0),
    taxPercent: Number(r.tax_percent || 0),
    active: r.active !== false
  }),

  requirementToDb: (req) => ({
    id: req.id,
    store_id: req.storeId,
    store_code: req.storeCode || null,
    store_name: req.storeName || null,
    location: req.location || null,
    date: req.date,
    status: req.status || 'Pending',
    items: req.items || [],
    total_amount: req.totalAmount || 0,
    last_updated: req.lastUpdated || null
  }),
  requirementFromDb: (r) => ({
    id: r.id,
    storeId: r.store_id,
    storeCode: r.store_code || '',
    storeName: r.store_name || '',
    location: r.location || '',
    date: r.date,
    status: r.status || 'Pending',
    items: r.items || [],
    totalAmount: Number(r.total_amount || 0),
    lastUpdated: r.last_updated || 'Just now'
  }),

  invoiceToDb: (inv) => ({
    id: inv.id,
    invoice_number: inv.invoiceNumber,
    requirement_id: inv.requirementId || null,
    store_id: inv.storeId,
    store_name: inv.storeName || null,
    location: inv.location || null,
    date: inv.date,
    due_date: inv.dueDate,
    items: inv.items || [],
    subtotal: inv.subtotal || 0,
    tax: inv.tax || 0,
    discount: inv.discount || 0,
    grand_total: inv.grandTotal || 0,
    paid_amount: inv.paidAmount || 0,
    outstanding_amount: inv.outstandingAmount || 0,
    status: inv.status || 'Generated'
  }),
  invoiceFromDb: (r) => ({
    id: r.id,
    invoiceNumber: r.invoice_number,
    requirementId: r.requirement_id,
    storeId: r.store_id,
    storeName: r.store_name || '',
    location: r.location || '',
    date: r.date,
    dueDate: r.due_date,
    items: r.items || [],
    subtotal: Number(r.subtotal || 0),
    tax: Number(r.tax || 0),
    discount: Number(r.discount || 0),
    grandTotal: Number(r.grand_total || 0),
    paidAmount: Number(r.paid_amount || 0),
    outstandingAmount: Number(r.outstanding_amount || 0),
    status: r.status || 'Generated'
  }),

  paymentToDb: (p) => ({
    id: p.id,
    invoice_id: p.invoiceId,
    store_id: p.storeId,
    store_name: p.storeName || null,
    amount: p.amount || 0,
    date: p.date,
    mode: p.mode || 'UPI',
    reference_no: p.referenceNo || p.referenceNumber || null,
    notes: p.notes || null
  }),
  paymentFromDb: (r) => ({
    id: r.id,
    invoiceId: r.invoice_id,
    storeId: r.store_id,
    storeName: r.store_name || '',
    amount: Number(r.amount || 0),
    date: r.date,
    mode: r.mode || 'UPI',
    referenceNo: r.reference_no || '',
    notes: r.notes || ''
  }),

  poToDb: (po) => ({
    id: po.id,
    date: po.date,
    status: po.status || 'Draft',
    total_cost: po.totalCost || 0,
    confirmed_at: po.confirmedAt || null
  }),
  poFromDb: (r) => ({
    id: r.id,
    date: r.date,
    status: r.status || 'Draft',
    totalCost: Number(r.total_cost || 0),
    confirmedAt: r.confirmed_at || null
  })
};

class DataStore {
  constructor() {
    this.isSynced = false;
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

  async syncAllFromSupabase() {
    if (!supabase) return;
    try {
      const [
        { data: storesData },
        { data: productsData },
        { data: reqsData },
        { data: invsData },
        { data: paysData },
        { data: posData },
        { data: buffersData }
      ] = await Promise.all([
        supabase.from('stores').select('*'),
        supabase.from('products').select('*'),
        supabase.from('daily_requirements').select('*'),
        supabase.from('invoices').select('*'),
        supabase.from('payments').select('*'),
        supabase.from('purchase_orders').select('*'),
        supabase.from('po_buffers').select('*')
      ]);

      if (storesData) {
        const stores = storesData.map(Mappers.storeFromDb);
        this.set(STORAGE_KEYS.STORES, stores);
      }
      if (productsData) {
        const products = productsData.map(Mappers.productFromDb);
        this.set(STORAGE_KEYS.PRODUCTS, products);
      }
      if (reqsData) {
        const reqs = reqsData.map(Mappers.requirementFromDb);
        this.set(STORAGE_KEYS.REQUIREMENTS, reqs);
      }
      if (invsData) {
        const invs = invsData.map(Mappers.invoiceFromDb);
        this.set(STORAGE_KEYS.INVOICES, invs);
      }
      if (paysData) {
        const pays = paysData.map(Mappers.paymentFromDb);
        this.set(STORAGE_KEYS.PAYMENTS, pays);
      }
      if (posData) {
        const posMap = {};
        posData.forEach(r => {
          posMap[r.date] = Mappers.poFromDb(r);
        });
        safeStorage.setItem(STORAGE_KEYS.POS, JSON.stringify(posMap));
      }
      if (buffersData) {
        const bufMap = {};
        buffersData.forEach(b => {
          bufMap[b.buffer_key] = Number(b.buffer_qty);
        });
        safeStorage.setItem(STORAGE_KEYS.PO_BUFFERS, JSON.stringify(bufMap));
      }

      this.isSynced = true;
    } catch (err) {
      console.error('Supabase sync error:', err);
    }
  }
}

const db = new DataStore();

export const dataStore = db;

// Stores Repository
export const storesRepository = {
  getAll: () => db.get(STORAGE_KEYS.STORES),
  getById: (id) => db.get(STORAGE_KEYS.STORES).find(s => s.id === id),
  save: (store) => {
    const stores = db.get(STORAGE_KEYS.STORES);
    if (!store.id) store.id = `store-${Date.now()}`;
    const idx = stores.findIndex(s => s.id === store.id);
    if (idx >= 0) stores[idx] = store;
    else stores.unshift(store);
    db.set(STORAGE_KEYS.STORES, stores);

    if (supabase) {
      supabase.from('stores').upsert(Mappers.storeToDb(store)).then(({ error }) => {
        if (error) console.error('Supabase store save error:', error.message);
      });
    }

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
    if (!product.id) product.id = `prd-${Date.now()}`;
    const idx = products.findIndex(p => p.id === product.id);
    if (idx >= 0) products[idx] = product;
    else products.unshift(product);
    db.set(STORAGE_KEYS.PRODUCTS, products);

    if (supabase) {
      supabase.from('products').upsert(Mappers.productToDb(product)).then(({ error }) => {
        if (error) console.error('Supabase product save error:', error.message);
      });
    }

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
    if (!requirement.id) requirement.id = `req-${requirement.date}-${requirement.storeId}`;
    const idx = requirements.findIndex(r => r.id === requirement.id);
    if (idx >= 0) requirements[idx] = requirement;
    else requirements.unshift(requirement);
    db.set(STORAGE_KEYS.REQUIREMENTS, requirements);

    if (supabase) {
      supabase.from('daily_requirements').upsert(Mappers.requirementToDb(requirement)).then(({ error }) => {
        if (error) console.error('Supabase requirement save error:', error.message);
      });
    }

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

    if (supabase) {
      supabase.from('invoices').upsert(Mappers.invoiceToDb(inv)).then(({ error }) => {
        if (error) console.error('Supabase invoice save error:', error.message);
      });
    }

    return inv;
  },

  save: (invoice) => {
    const invoices = db.get(STORAGE_KEYS.INVOICES);
    const idx = invoices.findIndex(i => i.id === invoice.id);
    if (idx >= 0) invoices[idx] = invoice;
    else invoices.unshift(invoice);
    db.set(STORAGE_KEYS.INVOICES, invoices);

    if (supabase) {
      supabase.from('invoices').upsert(Mappers.invoiceToDb(invoice)).then(({ error }) => {
        if (error) console.error('Supabase invoice save error:', error.message);
      });
    }

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

    if (supabase) {
      supabase.from('payments').insert(Mappers.paymentToDb(newPayment)).then(({ error }) => {
        if (error) console.error('Supabase payment save error:', error.message);
      });
    }

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
  setPOBuffer: (bufferKey, actualQty) => {
    const buffers = ordersRepository.getPOBuffers();
    buffers[bufferKey] = actualQty;
    safeStorage.setItem(STORAGE_KEYS.PO_BUFFERS, JSON.stringify(buffers));

    if (supabase) {
      supabase.from('po_buffers').upsert({
        buffer_key: bufferKey,
        buffer_qty: actualQty
      }, { onConflict: 'owner_id,buffer_key' }).then(({ error }) => {
        if (error) console.error('Supabase PO buffer save error:', error.message);
      });
    }
  },
  getByDate: (dateStr) => {
    try {
      const pos = JSON.parse(safeStorage.getItem(STORAGE_KEYS.POS) || '{}');
      return pos[dateStr] || null;
    } catch(e) { return null; }
  },
  savePO: (poRecord) => {
    let pos = {};
    try {
      pos = JSON.parse(safeStorage.getItem(STORAGE_KEYS.POS) || '{}');
    } catch(e) {}
    pos[poRecord.date] = poRecord;
    safeStorage.setItem(STORAGE_KEYS.POS, JSON.stringify(pos));

    if (supabase) {
      supabase.from('purchase_orders').upsert(Mappers.poToDb(poRecord)).then(({ error }) => {
        if (error) console.error('Supabase PO save error:', error.message);
      });
    }

    return poRecord;
  }
};
