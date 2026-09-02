import { authService } from '../services/authService.js';

// Use a Proxy to dynamically fetch the supabase client on every access,
// avoiding race conditions if the CDN script loads after this file is parsed.
const supabase = new Proxy({}, {
  get: function(target, prop) {
    const client = authService.getSupabaseClient();
    return client ? client[prop] : undefined;
  }
});

const STORAGE_KEYS = {
  STORES: 'dairy_app_stores_v2',
  PRODUCTS: 'dairy_app_products_v2',
  REQUIREMENTS: 'dairy_app_requirements_v2',
  INVOICES: 'dairy_app_invoices_v2',
  PAYMENTS: 'dairy_app_payments_v2',
  PO_BUFFERS: 'dairy_app_po_buffers_v2',
  POS: 'dairy_app_po_records_v2',
  RUNS: 'dairy_app_delivery_runs_v2',
  STOPS: 'dairy_app_delivery_stops_v2',
  ROLES: 'dairy_app_roles_v2'
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
    latitude: s.latitude ? Number(s.latitude) : null,
    longitude: s.longitude ? Number(s.longitude) : null,
    driver_notes: s.driverNotes || null,
    google_maps_url: s.googleMapsUrl || null,
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
    latitude: r.latitude ? Number(r.latitude) : null,
    longitude: r.longitude ? Number(r.longitude) : null,
    driverNotes: r.driver_notes || '',
    googleMapsUrl: r.google_maps_url || '',
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
    lastUpdated: r.last_updated || null
  }),

  invoiceToDb: (inv) => ({
    id: inv.id,
    invoice_number: inv.invoiceNumber,
    store_id: inv.storeId,
    store_code: inv.storeCode || null,
    store_name: inv.storeName || null,
    store_address: inv.storeAddress || null,
    date: inv.date,
    due_date: inv.dueDate || null,
    line_items: inv.lineItems || [],
    subtotal: inv.subtotal || 0,
    tax_total: inv.taxTotal || 0,
    grand_total: inv.grandTotal || 0,
    paid_amount: inv.paidAmount || 0,
    outstanding_amount: inv.outstandingAmount || 0,
    status: inv.status || 'Unpaid'
  }),
  invoiceFromDb: (r) => ({
    id: r.id,
    invoiceNumber: r.invoice_number,
    storeId: r.store_id,
    storeCode: r.store_code || '',
    storeName: r.store_name || '',
    storeAddress: r.store_address || '',
    date: r.date,
    dueDate: r.due_date || '',
    lineItems: r.line_items || [],
    subtotal: Number(r.subtotal || 0),
    taxTotal: Number(r.tax_total || 0),
    grandTotal: Number(r.grand_total || 0),
    paidAmount: Number(r.paid_amount || 0),
    outstandingAmount: Number(r.outstanding_amount || 0),
    status: r.status || 'Unpaid'
  }),

  paymentToDb: (pay) => ({
    id: pay.id,
    invoice_id: pay.invoiceId,
    store_id: pay.storeId,
    store_name: pay.storeName || null,
    date: pay.date,
    amount: pay.amount || 0,
    mode: pay.mode || 'Cash',
    reference_no: pay.referenceNo || null
  }),
  paymentFromDb: (r) => ({
    id: r.id,
    invoiceId: r.invoice_id,
    storeId: r.store_id,
    storeName: r.store_name || '',
    date: r.date,
    amount: Number(r.amount || 0),
    mode: r.mode || 'Cash',
    referenceNo: r.reference_no || ''
  }),

  poToDb: (po) => ({
    date: po.date,
    items: po.items || [],
    total_qty: po.totalQty || 0,
    total_cost: po.totalCost || 0,
    status: po.status || 'Draft',
    generated_at: po.generatedAt || null
  }),
  poFromDb: (r) => ({
    date: r.date,
    items: r.items || [],
    totalQty: Number(r.total_qty || 0),
    totalCost: Number(r.total_cost || 0),
    status: r.status || 'Draft',
    generatedAt: r.generated_at || null
  })
};

class LocalDataStore {
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const role = await userRolesRepository.getRole(user);

      if (role === 'driver') {
        // DRIVER ROLE: Fetch ONLY assigned delivery runs, stops, and stop items!
        const { data: runsData } = await supabase.from('delivery_runs').select('*').eq('driver_id', user.id);
        const runIds = (runsData || []).map(r => r.id);

        let stopsData = [];
        let itemsData = [];

        if (runIds.length > 0) {
          const { data: sData } = await supabase.from('delivery_stops').select('*').in('run_id', runIds);
          stopsData = sData || [];
          const stopIds = stopsData.map(s => s.id);
          if (stopIds.length > 0) {
            const { data: iData } = await supabase.from('delivery_stop_items').select('*').in('stop_id', stopIds);
            itemsData = iData || [];
          }
        }

        // Assemble runs with nested stops and items
        const structuredRuns = (runsData || []).map(run => {
          const runStops = stopsData
            .filter(s => s.run_id === run.id)
            .map(s => ({
              ...s,
              items: itemsData.filter(item => item.stop_id === s.id)
            }));
          return { ...run, stops: runStops };
        });

        this.set(STORAGE_KEYS.RUNS, structuredRuns);

        // CLEAR ALL ADMIN & FINANCIAL STORAGE TO PREVENT MEMORY LEAKS
        this.set(STORAGE_KEYS.STORES, []);
        this.set(STORAGE_KEYS.PRODUCTS, []);
        this.set(STORAGE_KEYS.REQUIREMENTS, []);
        this.set(STORAGE_KEYS.INVOICES, []);
        this.set(STORAGE_KEYS.PAYMENTS, []);
        safeStorage.setItem(STORAGE_KEYS.POS, '{}');
        safeStorage.setItem(STORAGE_KEYS.PO_BUFFERS, '{}');

      } else if (role === 'admin') {
        // ADMIN ROLE: Fetch full business dataset
        const [
          { data: storesData },
          { data: productsData },
          { data: reqsData },
          { data: invsData },
          { data: paysData },
          { data: posData },
          { data: buffersData },
          { data: runsData }
        ] = await Promise.all([
          supabase.from('stores').select('*'),
          supabase.from('products').select('*'),
          supabase.from('daily_requirements').select('*'),
          supabase.from('invoices').select('*'),
          supabase.from('payments').select('*'),
          supabase.from('purchase_orders').select('*'),
          supabase.from('po_buffers').select('*'),
          supabase.from('delivery_runs').select('*')
        ]);

        this.set(STORAGE_KEYS.STORES, (storesData || []).map(Mappers.storeFromDb));
        this.set(STORAGE_KEYS.PRODUCTS, (productsData || []).map(Mappers.productFromDb));
        this.set(STORAGE_KEYS.REQUIREMENTS, (reqsData || []).map(Mappers.requirementFromDb));
        this.set(STORAGE_KEYS.INVOICES, (invsData || []).map(Mappers.invoiceFromDb));
        this.set(STORAGE_KEYS.PAYMENTS, (paysData || []).map(Mappers.paymentFromDb));

        const runIds = (runsData || []).map(r => r.id);
        let stopsData = [];
        let itemsData = [];

        if (runIds.length > 0) {
          const { data: sData } = await supabase.from('delivery_stops').select('*').in('run_id', runIds);
          stopsData = sData || [];
          const stopIds = stopsData.map(s => s.id);
          if (stopIds.length > 0) {
            const { data: iData } = await supabase.from('delivery_stop_items').select('*').in('stop_id', stopIds);
            itemsData = iData || [];
          }
        }

        const structuredRuns = (runsData || []).map(run => {
          const runStops = stopsData
            .filter(s => s.run_id === run.id)
            .map(s => ({
              ...s,
              items: itemsData.filter(item => item.stop_id === s.id)
            }));
          return { ...run, stops: runStops };
        });

        this.set(STORAGE_KEYS.RUNS, structuredRuns);

        const posMap = {};
        (posData || []).forEach(r => { posMap[r.date] = Mappers.poFromDb(r); });
        safeStorage.setItem(STORAGE_KEYS.POS, JSON.stringify(posMap));

        const bufMap = {};
        (buffersData || []).forEach(b => { bufMap[b.buffer_key] = Number(b.buffer_qty); });
        safeStorage.setItem(STORAGE_KEYS.PO_BUFFERS, JSON.stringify(bufMap));
      } else {
        // UNASSIGNED / PENDING ROLE: Clear all storage
        this.set(STORAGE_KEYS.STORES, []);
        this.set(STORAGE_KEYS.PRODUCTS, []);
        this.set(STORAGE_KEYS.REQUIREMENTS, []);
        this.set(STORAGE_KEYS.INVOICES, []);
        this.set(STORAGE_KEYS.PAYMENTS, []);
        this.set(STORAGE_KEYS.RUNS, []);
      }

      this.isSynced = true;
    } catch (err) {
      console.error('Supabase sync error:', err);
    }
  }
}

export const dataStore = new LocalDataStore();

// Stores Repository
export const storesRepository = {
  getAll: () => dataStore.get(STORAGE_KEYS.STORES),
  getById: (id) => storesRepository.getAll().find(s => s.id === id),
  save: async (storeData) => {
    const isEdit = !!storeData.id;
    const storeObj = {
      id: storeData.id || `str-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      code: storeData.code,
      name: storeData.name,
      location: storeData.location || '',
      contactPerson: storeData.contactPerson || '',
      phone: storeData.phone || '',
      status: storeData.status || 'Active',
      address: storeData.address || '',
      latitude: storeData.latitude ? Number(storeData.latitude) : null,
      longitude: storeData.longitude ? Number(storeData.longitude) : null,
      driverNotes: storeData.driverNotes || '',
      googleMapsUrl: storeData.googleMapsUrl || '',
      recurringRequirements: storeData.recurringRequirements || {}
    };

    if (supabase) {
      const { error } = await supabase.from('stores').upsert(Mappers.storeToDb(storeObj));
      if (error) throw new Error(`Cloud save error (Stores): ${error.message}`);
    }

    const stores = storesRepository.getAll();
    const idx = stores.findIndex(s => s.id === storeObj.id);
    if (idx >= 0) stores[idx] = storeObj;
    else stores.push(storeObj);
    dataStore.set(STORAGE_KEYS.STORES, stores);
    return storeObj;
  },
  delete: async (id) => {
    if (supabase) {
      const { error } = await supabase.from('stores').delete().eq('id', id);
      if (error) throw new Error(`Cloud delete error (Stores): ${error.message}`);
    }

    let stores = storesRepository.getAll();
    stores = stores.filter(s => s.id !== id);
    dataStore.set(STORAGE_KEYS.STORES, stores);
  }
};

// Products Repository
export const productsRepository = {
  getAll: () => dataStore.get(STORAGE_KEYS.PRODUCTS),
  getById: (id) => productsRepository.getAll().find(p => p.id === id),
  save: async (productData) => {
    const productObj = {
      id: productData.id || `prd-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      sku: productData.sku,
      name: productData.name,
      category: productData.category || 'Milk',
      unit: productData.unit || 'Pkt',
      sellingPrice: Number(productData.sellingPrice || 0),
      purchasePrice: Number(productData.purchasePrice || 0),
      taxPercent: Number(productData.taxPercent || 0),
      active: productData.active !== false
    };

    if (supabase) {
      const { error } = await supabase.from('products').upsert(Mappers.productToDb(productObj));
      if (error) throw new Error(`Cloud save error (Products): ${error.message}`);
    }

    const products = productsRepository.getAll();
    const idx = products.findIndex(p => p.id === productObj.id);
    if (idx >= 0) products[idx] = productObj;
    else products.push(productObj);
    dataStore.set(STORAGE_KEYS.PRODUCTS, products);
    return productObj;
  },
  delete: async (id) => {
    if (supabase) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw new Error(`Cloud delete error (Products): ${error.message}`);
    }

    let products = productsRepository.getAll();
    products = products.filter(p => p.id !== id);
    dataStore.set(STORAGE_KEYS.PRODUCTS, products);
  }
};

// Daily Requirements Repository
export const requirementsRepository = {
  getAll: () => dataStore.get(STORAGE_KEYS.REQUIREMENTS),
  getByDate: (dateStr) => requirementsRepository.getAll().filter(r => r.date === dateStr),
  getByStoreAndDate: (storeId, dateStr) => requirementsRepository.getAll().find(r => r.storeId === storeId && r.date === dateStr),
  save: async (reqObj) => {
    if (supabase) {
      const { error } = await supabase.from('daily_requirements').upsert(Mappers.requirementToDb(reqObj));
      if (error) throw new Error(`Cloud save error (Daily Requirements): ${error.message}`);
    }

    const reqs = requirementsRepository.getAll();
    const idx = reqs.findIndex(r => r.id === reqObj.id || (r.storeId === reqObj.storeId && r.date === reqObj.date));
    if (idx >= 0) reqs[idx] = reqObj;
    else reqs.push(reqObj);
    dataStore.set(STORAGE_KEYS.REQUIREMENTS, reqs);
    return reqObj;
  }
};

// Invoices Repository
export const invoicesRepository = {
  getAll: () => dataStore.get(STORAGE_KEYS.INVOICES),
  getById: (id) => invoicesRepository.getAll().find(inv => inv.id === id),
  save: async (invoiceObj) => {
    if (supabase) {
      const { error } = await supabase.from('invoices').upsert(Mappers.invoiceToDb(invoiceObj));
      if (error) throw new Error(`Cloud save error (Invoices): ${error.message}`);
    }

    const invs = invoicesRepository.getAll();
    const idx = invs.findIndex(i => i.id === invoiceObj.id);
    if (idx >= 0) invs[idx] = invoiceObj;
    else invs.push(invoiceObj);
    dataStore.set(STORAGE_KEYS.INVOICES, invs);
    return invoiceObj;
  },
  delete: async (id) => {
    if (supabase) {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw new Error(`Cloud delete error (Invoices): ${error.message}`);
    }

    let invs = invoicesRepository.getAll();
    invs = invs.filter(i => i.id !== id);
    dataStore.set(STORAGE_KEYS.INVOICES, invs);
  }
};

// Payments Repository
export const paymentsRepository = {
  getAll: () => dataStore.get(STORAGE_KEYS.PAYMENTS),
  recordPayment: async (paymentData) => {
    const paymentObj = {
      id: `pay-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      invoiceId: paymentData.invoiceId,
      storeId: paymentData.storeId,
      storeName: paymentData.storeName || '',
      date: paymentData.date,
      amount: Number(paymentData.amount || 0),
      mode: paymentData.mode || 'Cash',
      referenceNo: paymentData.referenceNo || ''
    };

    if (supabase) {
      const { error } = await supabase.from('payments').insert(Mappers.paymentToDb(paymentObj));
      if (error) throw new Error(`Cloud save error (Payments): ${error.message}`);
    }

    const payments = paymentsRepository.getAll();
    payments.push(paymentObj);
    dataStore.set(STORAGE_KEYS.PAYMENTS, payments);

    const inv = invoicesRepository.getById(paymentData.invoiceId);
    if (inv) {
      inv.paidAmount = Number(inv.paidAmount || 0) + paymentObj.amount;
      inv.outstandingAmount = Math.max(0, inv.grandTotal - inv.paidAmount);
      inv.status = inv.outstandingAmount <= 0 ? 'Paid' : 'Partial';
      await invoicesRepository.save(inv);
    }

    return paymentObj;
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
    return poRecord;
  }
};

// User Roles Repository
export const userRolesRepository = {
  getRole: async (user) => {
    if (!user) return 'pending';
    if (supabase) {
      try {
        console.log("ROLE FETCH STARTING FOR USER:", user.id);
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        console.log("ROLE FETCH DB RESPONSE:", JSON.stringify({ data, error, user_id: user.id }));
        if (!error && data && data.role) {
          console.log("ROLE FETCH SUCCESS, RETURNING:", data.role);
          return data.role; // 'admin' or 'driver'
        } else {
          console.log("ROLE FETCH FELL THROUGH. ERROR:", error, "DATA:", data);
        }
      } catch (e) {
        console.warn('Could not fetch user role from Supabase:', e);
      }
    } else {
      console.error("ROLE FETCH FAILED: supabase CLIENT IS NULL OR UNDEFINED");
    }
    console.log("ROLE FETCH RETURNING PENDING FALLBACK");
    return 'pending'; // STRICT: Unassigned user is NEVER an admin!
  },
  setRole: async (userId, role) => {
    if (supabase) {
      const { error } = await supabase.from('user_roles').upsert({
        user_id: userId,
        role: role
      });
      if (error) throw new Error(`Failed to assign role: ${error.message}`);
    }
  }
};

// Delivery Runs Repository (Isolated Driver Data Model)
export const deliveryRunsRepository = {
  getAll: () => dataStore.get(STORAGE_KEYS.RUNS),
  getByDate: (dateStr) => deliveryRunsRepository.getAll().filter(r => r.date === dateStr),
  getByDriverAndDate: (driverId, dateStr) => deliveryRunsRepository.getAll().filter(r => r.driver_id === driverId && r.date === dateStr),

  createRun: async (runData) => {
    const runId = `run-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const runObj = {
      id: runId,
      driver_id: runData.driver_id,
      date: runData.date,
      status: 'Scheduled',
      notes: runData.notes || ''
    };

    if (supabase) {
      const { error: runErr } = await supabase.from('delivery_runs').insert(runObj);
      if (runErr) throw new Error(`Failed to create delivery run: ${runErr.message}`);

      // Insert stops & items
      for (const stop of (runData.stops || [])) {
        const stopId = `stop-${Date.now()}-${Math.floor(Math.random()*10000)}`;
        const stopRecord = {
          id: stopId,
          run_id: runId,
          store_id: stop.store_id,
          sequence: stop.sequence || 1,
          store_name: stop.store_name,
          address: stop.address || '',
          location: stop.location || '',
          latitude: stop.latitude || null,
          longitude: stop.longitude || null,
          contact_person: stop.contact_person || '',
          phone: stop.phone || '',
          driver_notes: stop.driver_notes || '',
          google_maps_url: stop.google_maps_url || '',
          status: 'Pending'
        };

        const { error: stopErr } = await supabase.from('delivery_stops').insert(stopRecord);
        if (stopErr) throw new Error(`Failed to save delivery stop: ${stopErr.message}`);

        if (stop.items && stop.items.length > 0) {
          const itemRecords = stop.items.map(item => ({
            id: `item-${Date.now()}-${Math.floor(Math.random()*10000)}`,
            stop_id: stopId,
            product_name: item.product_name,
            quantity: Number(item.quantity || 0),
            unit: item.unit || 'Pkt'
          }));
          const { error: itemErr } = await supabase.from('delivery_stop_items').insert(itemRecords);
          if (itemErr) throw new Error(`Failed to save delivery items: ${itemErr.message}`);
        }
      }
    }

    await dataStore.syncAllFromSupabase();
    return runObj;
  },

  // SECURE DRIVER STATUS UPDATE VIA SUPABASE RPC (PREVENTS DIRECT TABLE MUTATION)
  updateStopStatus: async (stopId, status) => {
    if (supabase) {
      const rpcName = status === 'Delivered' ? 'mark_my_stop_delivered' : 'mark_my_stop_pending';
      const { data, error } = await supabase.rpc(rpcName, { p_stop_id: stopId });
      if (error) throw new Error(`Status update failed: ${error.message}`);
    }

    // Update local cache
    const runs = deliveryRunsRepository.getAll();
    runs.forEach(run => {
      if (run.stops) {
        run.stops.forEach(stop => {
          if (stop.id === stopId) stop.status = status;
        });
      }
    });
    dataStore.set(STORAGE_KEYS.RUNS, runs);
  },

  deleteRun: async (runId) => {
    if (supabase) {
      const { error } = await supabase.from('delivery_runs').delete().eq('id', runId);
      if (error) throw new Error(`Failed to delete delivery run: ${error.message}`);
    }

    let runs = deliveryRunsRepository.getAll();
    runs = runs.filter(r => r.id !== runId);
    dataStore.set(STORAGE_KEYS.RUNS, runs);
  }
};

// Driver Tracking Repository
export const driverTrackingRepository = {
  updateLocation: async (driverId, lat, lng) => {
    if (!supabase) return;
    try {
      await supabase.from('driver_locations').upsert({
        driver_id: driverId,
        latitude: lat,
        longitude: lng,
        updated_at: new Date().toISOString()
      }, { onConflict: 'driver_id' });
    } catch(err) {
      console.warn('Silent location update failure:', err);
    }
  },

  getAllLocations: async () => {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase.from('driver_locations').select('*');
      if (error) throw error;
      return data || [];
    } catch(err) {
      console.error('Failed to fetch driver locations:', err);
      return [];
    }
  }
};
