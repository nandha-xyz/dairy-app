import { deliveryRunsRepository, storesRepository, productsRepository } from '../repositories/index.js';
import { workflowEngine } from '../services/workflowEngine.js';

export const deliveryChallanView = {
  render(runId) {
    const runs = deliveryRunsRepository.getAll();
    const run = runs.find(r => r.id === runId);

    if (!run) {
      return `
        <div style="padding: 2rem; text-align: center; font-family: sans-serif;">
          <h2>Error: Delivery Run Not Found</h2>
          <p>The requested delivery run (${runId}) could not be found.</p>
        </div>
      `;
    }

    const stops = run.stops || [];
    stops.sort((a, b) => (a.sequence || 1) - (b.sequence || 1));

    // Extract all unique product names to create columns
    const productNamesSet = new Set();
    stops.forEach(stop => {
      (stop.items || []).forEach(item => {
        productNamesSet.add(item.product_name);
      });
    });
    
    // Convert to array and try to map to short names for columns if possible (e.g. "Full Cream Milk 500ml" -> "Milk 500ml")
    // For now we'll just use the full names or split them if they are too long.
    const productColumns = Array.from(productNamesSet).sort();

    // Map active products to calculate amounts
    const allProducts = productsRepository.getAll();

    // Build table rows
    const rowsHtml = stops.map(stop => {
      const store = storesRepository.getById(stop.store_id);
      
      // Calculate today's amount
      let todaysAmount = 0;
      const productQtysHtml = productColumns.map(pName => {
        const item = (stop.items || []).find(i => i.product_name === pName);
        if (item) {
          const product = allProducts.find(p => p.name === pName);
          if (product) {
            todaysAmount += (item.quantity * product.sellingPrice);
          }
          return `<td class="text-center fw-bold">${item.quantity}</td>`;
        }
        return `<td></td>`;
      }).join('');

      // Get Outstanding Balance (Previous)
      let prevBalance = 0;
      if (store) {
        const totalOutstanding = workflowEngine.getStoreOutstandingBalance(store.id);
        // We subtract today's amount from total outstanding if today's invoice is already generated, 
        // but to be safe we'll just use total outstanding as the "Balance".
        // Actually, let's strictly calculate past balance.
        prevBalance = totalOutstanding;
      }

      const totalAmount = todaysAmount + prevBalance;

      return `
        <tr>
          <td class="text-center">${stop.sequence}</td>
          <td class="store-name">${stop.store_name}</td>
          ${productQtysHtml}
          <td class="text-right">${todaysAmount > 0 ? todaysAmount.toFixed(2) : ''}</td>
          <td class="text-right">${prevBalance > 0 ? prevBalance.toFixed(2) : ''}</td>
          <td class="text-right fw-bold">${totalAmount > 0 ? totalAmount.toFixed(2) : ''}</td>
          <td class="write-in"></td>
          <td class="write-in"></td>
          <td class="write-in"></td>
          <td class="write-in"></td>
        </tr>
      `;
    }).join('');

    // Generate Header HTML
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Delivery Challan - Run ${run.id}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
          
          body {
            font-family: 'Inter', sans-serif;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 20px;
            font-size: 11px;
          }

          .challan-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }

          .header-left h1 {
            margin: 0;
            font-size: 18px;
            font-weight: 800;
            text-transform: uppercase;
          }

          .header-left p {
            margin: 4px 0 0 0;
            font-size: 11px;
          }

          .header-right {
            text-align: right;
          }

          .header-right h2 {
            margin: 0 0 5px 0;
            font-size: 16px;
            text-transform: uppercase;
            font-weight: 800;
          }

          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 5px 20px;
            font-size: 12px;
          }

          .meta-item {
            display: flex;
            justify-content: space-between;
          }

          table.challan-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }

          table.challan-table th, table.challan-table td {
            border: 1px solid #000;
            padding: 4px;
            font-size: 10px;
          }

          table.challan-table th {
            background-color: #f0f0f0 !important;
            font-weight: 700;
            text-align: center;
            -webkit-print-color-adjust: exact;
          }

          .store-name {
            font-weight: 600;
            max-width: 150px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .fw-bold { font-weight: 700; }
          
          .write-in {
            width: 50px;
          }

          /* Print specific styles */
          @media print {
            body {
              padding: 0;
              margin: 0;
            }
            @page {
              margin: 1cm;
              size: landscape;
            }
            table.challan-table th {
              background-color: #f0f0f0 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        
        <div class="challan-header">
          <div class="header-left">
            <h1>KOVAL DAIRY DISTRIBUTORS</h1>
            <p>123 Main Street, Coimbatore, TN | Contact: +91 99849 20255</p>
          </div>
          <div class="header-right">
            <h2>DELIVERY CHALLAN</h2>
            <div class="meta-grid">
              <div class="meta-item"><strong>Date:</strong> <span>${run.date}</span></div>
              <div class="meta-item"><strong>Starting Km:</strong> <span>________</span></div>
              <div class="meta-item"><strong>Driver ID:</strong> <span>${run.driver_id}</span></div>
              <div class="meta-item"><strong>Closing Km:</strong> <span>________</span></div>
            </div>
          </div>
        </div>

        <table class="challan-table">
          <thead>
            <tr>
              <th style="width: 30px;">Code</th>
              <th>Store Name</th>
              ${productColumns.map(p => `<th>${p.substring(0, 15)}</th>`).join('')}
              <th style="width: 55px;">Amount</th>
              <th style="width: 55px;">Balance</th>
              <th style="width: 65px;">Total</th>
              <th>Received</th>
              <th>Cr.Bal</th>
              <th>Given</th>
              <th>Taken</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; margin-top: 30px; font-size: 12px; font-weight: 600;">
          <div>Driver Signature: ______________________</div>
          <div>Manager Signature: ______________________</div>
        </div>

        <script>
          // Automatically trigger print dialog when window opens
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;
  }
};
