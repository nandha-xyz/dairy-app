export const SEEDED_PRODUCTS = [
  { id: 'p1', name: 'Fresh Full Cream Milk', sku: 'PRD-MILK-01', category: 'Milk', unit: 'Litre', sellingPrice: 60, purchasePrice: 48, taxPercent: 0, active: true },
  { id: 'p2', name: 'Fresh Cow Curd', sku: 'PRD-CURD-01', category: 'Curd', unit: 'Kilogram', sellingPrice: 90, purchasePrice: 70, taxPercent: 0, active: true },
  { id: 'p3', name: 'Malai Paneer', sku: 'PRD-PAN-01', category: 'Paneer', unit: 'Kilogram', sellingPrice: 360, purchasePrice: 290, taxPercent: 5, active: true },
  { id: 'p4', name: 'Processed Cheese Block', sku: 'PRD-CHS-01', category: 'Cheese', unit: 'Kilogram', sellingPrice: 480, purchasePrice: 390, taxPercent: 5, active: true },
  { id: 'p5', name: 'Spiced Buttermilk', sku: 'PRD-BM-01', category: 'Beverages', unit: 'Litre', sellingPrice: 40, purchasePrice: 28, taxPercent: 0, active: true },
  { id: 'p6', name: 'Pure Desi Cow Ghee', sku: 'PRD-GHEE-01', category: 'Ghee', unit: 'Kilogram', sellingPrice: 650, purchasePrice: 520, taxPercent: 12, active: true },
  { id: 'p7', name: 'Fresh Cooking Cream', sku: 'PRD-CRM-01', category: 'Cream', unit: 'Kilogram', sellingPrice: 240, purchasePrice: 190, taxPercent: 5, active: true },
  { id: 'p8', name: 'Badam Flavoured Milk', sku: 'PRD-FLM-01', category: 'Beverages', unit: 'Packet', sellingPrice: 35, purchasePrice: 26, taxPercent: 12, active: true }
];

export const SEEDED_STORES = [
  { id: 's1', code: 'STR-CBE-001', name: 'Kovai Fresh Dairy Point', location: 'Coimbatore', contactPerson: 'R. Soundararajan', phone: '+91 98421 10001', status: 'Active', address: '124 DB Road, RS Puram, Coimbatore - 641002', recurringRequirements: { p1: 45, p2: 12, p3: 4, p5: 20 } },
  { id: 's2', code: 'STR-CBE-002', name: 'Annapoorna Bakers & Dairy', location: 'Coimbatore', contactPerson: 'K. Venkatesh', phone: '+91 98421 10002', status: 'Active', address: '45 Cross Cut Road, Gandhipuram, Coimbatore - 641012', recurringRequirements: { p1: 60, p2: 20, p3: 8, p4: 3, p7: 5 } },
  { id: 's3', code: 'STR-CBE-003', name: 'Race Course Organics', location: 'Coimbatore', contactPerson: 'S. Mahalakshmi', phone: '+91 98421 10003', status: 'Active', address: '8 Race Course Road, Coimbatore - 641018', recurringRequirements: { p1: 30, p2: 10, p6: 4 } },
  { id: 's4', code: 'STR-CBE-004', name: 'Peelamedu Super Mart', location: 'Coimbatore', contactPerson: 'M. Selvam', phone: '+91 98421 10004', status: 'Active', address: '402 Avinashi Road, Peelamedu, Coimbatore - 641004', recurringRequirements: { p1: 50, p2: 15, p3: 5, p8: 24 } },
  { id: 's5', code: 'STR-CBE-005', name: 'Sri Krishna Sweets Outlet', location: 'Coimbatore', contactPerson: 'P. Balaji', phone: '+91 98421 10005', status: 'Active', address: '88 Mettupalayam Road, Saibaba Colony, Coimbatore', recurringRequirements: { p1: 80, p2: 25, p6: 10, p7: 8 } },
  
  { id: 's6', code: 'STR-POL-001', name: 'Pollachi Dairy Depot', location: 'Pollachi', contactPerson: 'A. Thangaraj', phone: '+91 97871 20001', status: 'Active', address: '12 New Scheme Road, Pollachi - 642001', recurringRequirements: { p1: 40, p2: 10, p5: 30 } },
  { id: 's7', code: 'STR-POL-002', name: 'Green Pastures Mart', location: 'Pollachi', contactPerson: 'V. Karthik', phone: '+91 97871 20002', status: 'Active', address: '78 Bus Stand Commercial Complex, Pollachi - 642001', recurringRequirements: { p1: 35, p2: 8, p3: 3 } },
  { id: 's8', code: 'STR-POL-003', name: 'Mahalingapuram Stores', location: 'Pollachi', contactPerson: 'N. Radhakrishnan', phone: '+91 97871 20003', status: 'Active', address: '15 Mahalingapuram Main Road, Pollachi - 642002', recurringRequirements: { p1: 25, p2: 6, p5: 15 } },
  { id: 's9', code: 'STR-POL-004', name: 'Anaimalai Fresh Hub', location: 'Pollachi', contactPerson: 'S. Durairaj', phone: '+91 97871 20004', status: 'Active', address: '3 Sector 2, Anaimalai Road, Pollachi - 642003', recurringRequirements: { p1: 30, p2: 10, p8: 12 } },
  { id: 's10', code: 'STR-POL-005', name: 'Valparai Highway Bakers', location: 'Pollachi', contactPerson: 'C. Murugan', phone: '+91 97871 20005', status: 'Active', address: '102 Ghat Road Junction, Pollachi', recurringRequirements: { p1: 45, p2: 14, p4: 2, p5: 25 } },

  { id: 's11', code: 'STR-TPR-001', name: 'Tiruppur Textile Canteen Mart', location: 'Tiruppur', contactPerson: 'D. Arumugam', phone: '+91 99441 30001', status: 'Active', address: '220 PN Road, Tiruppur - 641602', recurringRequirements: { p1: 100, p2: 35, p5: 50 } },
  { id: 's12', code: 'STR-TPR-002', name: 'Royal Sweets & Dairy', location: 'Tiruppur', contactPerson: 'K. Saravanan', phone: '+91 99441 30002', status: 'Active', address: '44 Mangalam Road, Tiruppur - 641604', recurringRequirements: { p1: 70, p2: 20, p3: 10, p6: 5 } },
  { id: 's13', code: 'STR-TPR-003', name: 'Avinashi Road Express Mart', location: 'Tiruppur', contactPerson: 'G. Muthusamy', phone: '+91 99441 30003', status: 'Active', address: '105 Avinashi Main Road, Tiruppur - 641603', recurringRequirements: { p1: 40, p2: 12, p8: 30 } },
  { id: 's14', code: 'STR-TPR-004', name: 'Kumaran Heights Supermarket', location: 'Tiruppur', contactPerson: 'E. Vijaykumar', phone: '+91 99441 30004', status: 'Active', address: '18 Kumaran Road, Tiruppur - 641601', recurringRequirements: { p1: 55, p2: 18, p4: 4, p5: 20 } },
  { id: 's15', code: 'STR-TPR-005', name: 'Dharapuram Highway Junction Store', location: 'Tiruppur', contactPerson: 'T. Palanisamy', phone: '+91 99441 30005', status: 'Active', address: '89 Dharapuram Road, Tiruppur', recurringRequirements: { p1: 35, p2: 10, p3: 3 } },

  { id: 's16', code: 'STR-ERD-001', name: 'Erode Central Dairy Bazaar', location: 'Erode', contactPerson: 'B. Senthilnathan', phone: '+91 96551 40001', status: 'Active', address: '55 Brough Road, Erode - 638001', recurringRequirements: { p1: 90, p2: 30, p3: 8, p6: 6 } },
  { id: 's17', code: 'STR-ERD-002', name: 'Perundurai Fresh Organics', location: 'Erode', contactPerson: 'L. Chandrasekaran', phone: '+91 96551 40002', status: 'Active', address: '14 Perundurai Road, Erode - 638011', recurringRequirements: { p1: 40, p2: 12, p5: 20 } },
  { id: 's18', code: 'STR-ERD-003', name: 'Lakshmi Sweets & Bakery', location: 'Erode', contactPerson: 'S. Ramanathan', phone: '+91 96551 40003', status: 'Active', address: '30 EVN Road, Erode - 638009', recurringRequirements: { p1: 75, p2: 22, p3: 6, p7: 4 } },
  { id: 's19', code: 'STR-ERD-004', name: 'Sathy Road Super Mart', location: 'Erode', contactPerson: 'M. Loganathan', phone: '+91 96551 40004', status: 'Active', address: '112 Sathy Road, Kurikaranpalayam, Erode - 638004', recurringRequirements: { p1: 50, p2: 15, p8: 20 } },
  { id: 's20', code: 'STR-ERD-005', name: 'Bhavani River Junction Outlet', location: 'Erode', contactPerson: 'P. Shanmugam', phone: '+91 96551 40005', status: 'Active', address: '45 Bhavani Main Road, Erode - 638005', recurringRequirements: { p1: 30, p2: 10, p5: 15 } }
];

export function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDateOffsetString(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Generate realistic 7-day requirements, invoices, and payments history
export function generateInitialHistory() {
  const todayStr = getTodayDateString();
  const requirements = [];
  const invoices = [];
  const payments = [];
  let invoiceCounter = 1000;
  let paymentCounter = 5000;

  // Generate for days -6 to 0 (today is 0)
  for (let offset = -6; offset <= 0; offset++) {
    const dateStr = getDateOffsetString(offset);
    const isToday = offset === 0;

    SEEDED_STORES.forEach((store, idx) => {
      // Deterministic slight variation in daily order
      const reqItems = [];
      let totalAmount = 0;

      Object.entries(store.recurringRequirements).forEach(([productId, baseQty]) => {
        const variation = (idx + Math.abs(offset)) % 3 - 1; // -1, 0, or +1
        const qty = Math.max(0, baseQty + variation);
        if (qty > 0) {
          const product = SEEDED_PRODUCTS.find(p => p.id === productId);
          const itemAmount = qty * product.sellingPrice;
          totalAmount += itemAmount;
          reqItems.push({
            productId,
            productName: product.name,
            unit: product.unit,
            rate: product.sellingPrice,
            quantity: qty,
            amount: itemAmount
          });
        }
      });

      // Today's status: 14 confirmed, 4 draft, 2 pending
      let status = 'Confirmed';
      if (isToday) {
        if (idx >= 18) status = 'Pending';
        else if (idx >= 14) status = 'Draft';
        else status = 'Confirmed';
      }

      const reqId = `req-${dateStr}-${store.id}`;
      requirements.push({
        id: reqId,
        storeId: store.id,
        storeCode: store.code,
        storeName: store.name,
        location: store.location,
        date: dateStr,
        status: status,
        items: reqItems,
        totalAmount: totalAmount,
        lastUpdated: isToday ? 'Today, 08:30 AM' : `${dateStr} 07:45 AM`
      });

      // Create invoice for confirmed historical items and confirmed today items
      if (status === 'Confirmed') {
        invoiceCounter++;
        const invNumber = `INV-${dateStr.replace(/-/g, '')}-${invoiceCounter}`;
        
        let invStatus = 'Paid';
        let paidAmount = totalAmount;

        if (isToday) {
          invStatus = (idx % 2 === 0) ? 'Generated' : 'Paid';
          paidAmount = invStatus === 'Paid' ? totalAmount : 0;
        } else if (offset === -1) {
          // Yesterday: some partially paid
          if (idx % 4 === 0) {
            invStatus = 'Partially Paid';
            paidAmount = Math.round(totalAmount * 0.5);
          } else if (idx % 7 === 0) {
            invStatus = 'Generated';
            paidAmount = 0;
          }
        } else if (offset < -3 && idx % 5 === 0) {
          invStatus = 'Overdue';
          paidAmount = 0;
        }

        const invId = `inv-${invNumber}`;
        invoices.push({
          id: invId,
          invoiceNumber: invNumber,
          requirementId: reqId,
          storeId: store.id,
          storeName: store.name,
          location: store.location,
          date: dateStr,
          dueDate: dateStr,
          items: reqItems,
          subtotal: totalAmount,
          tax: Math.round(totalAmount * 0.02),
          discount: 0,
          grandTotal: Math.round(totalAmount * 1.02),
          paidAmount: paidAmount,
          outstandingAmount: Math.round(totalAmount * 1.02) - paidAmount,
          status: invStatus
        });

        if (paidAmount > 0) {
          paymentCounter++;
          payments.push({
            id: `pay-${paymentCounter}`,
            invoiceId: invId,
            invoiceNumber: invNumber,
            storeId: store.id,
            storeName: store.name,
            date: dateStr,
            amount: paidAmount,
            method: (idx % 3 === 0) ? 'UPI' : (idx % 3 === 1) ? 'Bank Transfer' : 'Cash',
            referenceNumber: `TXN${paymentCounter}992`,
            notes: 'Daily order payment'
          });
        }
      }
    });
  }

  return { requirements, invoices, payments };
}
