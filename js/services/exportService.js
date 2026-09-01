import { storesRepository, productsRepository, requirementsRepository, invoicesRepository, paymentsRepository, ordersRepository } from '../repositories/index.js';
import { getTodayDateString } from '../data/seededData.js';

// Trigger safe browser file download
function triggerDownload(content, filename, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Convert JSON items array to CSV string
function convertToCSV(items, headers, keyMapper) {
  if (!items || items.length === 0) return null;
  const rowHeaders = headers.join(',');
  const rows = items.map(item => {
    return keyMapper(item).map(val => {
      let str = (val === null || val === undefined) ? '' : String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        str = `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',');
  });
  return [rowHeaders, ...rows].join('\n');
}

export const exportService = {
  // 1. Full Backup JSON Export
  exportFullBackupJSON: () => {
    const today = getTodayDateString();

    // Sanitize objects to ensure technical / sensitive fields like owner_id, passwords, keys are stripped
    const sanitize = (list) => list.map(item => {
      const clone = { ...item };
      delete clone.owner_id;
      delete clone.password;
      delete clone.access_token;
      delete clone.secret;
      return clone;
    });

    const stores = sanitize(storesRepository.getAll());
    const products = sanitize(productsRepository.getAll());
    const requirements = sanitize(requirementsRepository.getAll());
    const invoices = sanitize(invoicesRepository.getAll());
    const payments = sanitize(paymentsRepository.getAll());
    const poBuffers = ordersRepository.getPOBuffers();

    const totalRecords = stores.length + products.length + requirements.length + invoices.length + payments.length;
    if (totalRecords === 0) {
      alert('⚠️ No cloud data available to export. Create stores or products first!');
      return;
    }

    const backupData = {
      app: 'Dairy App Backup',
      exportedAt: new Date().toISOString(),
      exportDate: today,
      data: {
        stores,
        products,
        requirements,
        invoices,
        payments,
        poBuffers
      }
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    triggerDownload(jsonStr, `kovai-dairy-backup-${today}.json`, 'application/json');
  },

  // 2. Stores CSV Export
  exportStoresCSV: () => {
    const today = getTodayDateString();
    const stores = storesRepository.getAll();
    if (stores.length === 0) {
      alert('⚠️ No Stores data available to export.');
      return;
    }

    const headers = ['Store Code', 'Store Name', 'Location', 'Contact Person', 'Phone', 'Status', 'Address'];
    const csv = convertToCSV(stores, headers, s => [
      s.code,
      s.name,
      s.location,
      s.contactPerson,
      s.phone,
      s.status,
      s.address
    ]);

    triggerDownload(csv, `kovai-dairy-stores-${today}.csv`, 'text/csv;charset=utf-8;');
  },

  // 3. Products CSV Export
  exportProductsCSV: () => {
    const today = getTodayDateString();
    const products = productsRepository.getAll();
    if (products.length === 0) {
      alert('⚠️ No Products data available to export.');
      return;
    }

    const headers = ['SKU', 'Product Name', 'Category', 'Unit', 'Selling Price (INR)', 'Purchase Price (INR)', 'Tax (%)', 'Status'];
    const csv = convertToCSV(products, headers, p => [
      p.sku,
      p.name,
      p.category,
      p.unit,
      p.sellingPrice,
      p.purchasePrice,
      p.taxPercent,
      p.active ? 'Active' : 'Inactive'
    ]);

    triggerDownload(csv, `kovai-dairy-products-${today}.csv`, 'text/csv;charset=utf-8;');
  },

  // 4. Invoices CSV Export
  exportInvoicesCSV: () => {
    const today = getTodayDateString();
    const invoices = invoicesRepository.getAll();
    if (invoices.length === 0) {
      alert('⚠️ No Invoices data available to export.');
      return;
    }

    const headers = ['Invoice Number', 'Store Name', 'Location', 'Date', 'Due Date', 'Subtotal', 'Tax', 'Grand Total', 'Paid Amount', 'Outstanding Amount', 'Status'];
    const csv = convertToCSV(invoices, headers, i => [
      i.invoiceNumber,
      i.storeName,
      i.location,
      i.date,
      i.dueDate,
      i.subtotal,
      i.tax,
      i.grandTotal,
      i.paidAmount,
      i.outstandingAmount,
      i.status
    ]);

    triggerDownload(csv, `kovai-dairy-invoices-${today}.csv`, 'text/csv;charset=utf-8;');
  },

  // 5. Payments CSV Export
  exportPaymentsCSV: () => {
    const today = getTodayDateString();
    const payments = paymentsRepository.getAll();
    if (payments.length === 0) {
      alert('⚠️ No Payments data available to export.');
      return;
    }

    const headers = ['Payment ID', 'Invoice ID', 'Store Name', 'Amount (INR)', 'Date', 'Mode', 'Reference No', 'Notes'];
    const csv = convertToCSV(payments, headers, p => [
      p.id,
      p.invoiceId,
      p.storeName,
      p.amount,
      p.date,
      p.mode,
      p.referenceNo || p.referenceNumber,
      p.notes
    ]);

    triggerDownload(csv, `kovai-dairy-payments-${today}.csv`, 'text/csv;charset=utf-8;');
  }
};
