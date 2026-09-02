export const driverDashboardView = {
  render(deliveryRuns = [], currentDate = '') {
    if (!deliveryRuns || deliveryRuns.length === 0) {
      return `
        <div style="max-width: 600px; margin: 2rem auto; padding: 0 1rem;">
          <div class="card" style="text-align: center; padding: 3rem 1.5rem; border-radius: 16px;">
            <div style="width: 72px; height: 72px; margin: 0 auto 1.25rem auto; background: #EFF6FF; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; color: #2563EB;">
              🚛
            </div>
            <h3 style="font-size: 1.3rem; font-weight: 800; color: #0F172A; margin: 0 0 0.5rem 0;">No Deliveries Assigned Today</h3>
            <p style="font-size: 0.9rem; color: #64748B; margin: 0 0 1.5rem 0; line-height: 1.5;">
              You have no delivery stops assigned for <strong>${currentDate}</strong>.<br/>Please check with your Dispatcher or Business Administrator.
            </p>
            <div style="display: inline-block; padding: 0.5rem 1rem; background: #F1F5F9; border-radius: 20px; font-size: 0.8rem; color: #475569; font-weight: 600;">
              🗓️ ${currentDate}
            </div>
          </div>
        </div>
      `;
    }

    // Consolidate all stops across runs for today
    const allStops = [];
    deliveryRuns.forEach(run => {
      if (run.stops && Array.isArray(run.stops)) {
        allStops.push(...run.stops);
      }
    });

    // Sort stops by sequence
    allStops.sort((a, b) => (a.sequence || 1) - (b.sequence || 1));

    // Calculate aggregated warehouse pickup manifest
    const pickupTotals = {};
    allStops.forEach(stop => {
      if (stop.items && Array.isArray(stop.items)) {
        stop.items.forEach(item => {
          const key = `${item.product_name} (${item.unit || 'Unit'})`;
          pickupTotals[key] = (pickupTotals[key] || 0) + (Number(item.quantity) || 0);
        });
      }
    });

    const completedCount = allStops.filter(s => s.status === 'Delivered').length;

    return `
      <div style="max-width: 650px; margin: 0 auto; padding: 0.5rem 0 3rem 0;">
        
        <!-- Driver Route Summary Header Card -->
        <div class="card" style="background: linear-gradient(135deg, #0F172A, #1E293B); color: white; margin-bottom: 1.25rem; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.3);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <div>
              <div style="font-size: 0.75rem; text-transform: uppercase; tracking: 0.05em; color: #94A3B8; font-weight: 700;">Driver Field Portal</div>
              <h2 style="font-size: 1.4rem; font-weight: 800; color: white; margin: 0.1rem 0 0 0;">Today's Delivery Manifest</h2>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;">
              <span style="background: rgba(255,255,255,0.15); padding: 0.3rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 700; color: #60A5FA;">
                🗓️ ${currentDate}
              </span>
              <button class="btn btn-sm btn-print-challan" data-run-id="${deliveryRuns[0]?.id}" style="background: rgba(255,255,255,0.15); color: white; border: none; padding: 0.3rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 700; cursor: pointer;">
                🖨️ Print / Download
              </button>
            </div>
          </div>

          <!-- Route Progress Bar -->
          <div style="margin-top: 1rem;">
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #CBD5E1; margin-bottom: 0.4rem; font-weight: 600;">
              <span>Route Completion</span>
              <span>${completedCount} / ${allStops.length} Stops Delivered</span>
            </div>
            <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
              <div style="width: ${allStops.length > 0 ? (completedCount / allStops.length) * 100 : 0}%; height: 100%; background: #10B981; transition: width 0.4s ease;"></div>
            </div>
          </div>
        </div>

        <!-- 1. WAREHOUSE PICKUP & LOADING MANIFEST -->
        <div class="card" style="margin-bottom: 1.25rem; border-radius: 14px; border-left: 5px solid #2563EB;">
          <h3 style="font-size: 1rem; font-weight: 800; color: #0F172A; margin: 0 0 0.75rem 0; display: flex; align-items: center; gap: 0.4rem;">
            <span>📦 Warehouse Pickup List</span>
            <span style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted);">(Total products to load into truck)</span>
          </h3>

          ${Object.keys(pickupTotals).length === 0 ? `
            <div style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 1rem 0;">No items registered for pickup today.</div>
          ` : `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 0.6rem;">
              ${Object.entries(pickupTotals).map(([productLabel, qty]) => `
                <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 0.6rem 0.8rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 0.825rem; font-weight: 600; color: #334155;">${productLabel}</span>
                  <span style="font-size: 0.95rem; font-weight: 800; color: #2563EB;">${qty}</span>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- NEW: ROUTE TOPOLOGY MAP (LEAFLET) -->
        <div class="card" style="padding: 0; overflow: hidden; margin-bottom: 1.5rem; border-radius: 12px; border: 1px solid var(--border-color); box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div id="driver-route-map" style="height: 300px; width: 100%; background: #E2E8F0; z-index: 1;"></div>
          <div style="padding: 0.5rem 1rem; background: #F8FAFC; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: #64748B;">
            <span>🗺️ Route Overview: <strong>${allStops.filter(s => s.latitude && s.longitude).length} mapped stops</strong></span>
            <span>Map Data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener" style="color: #2563EB;">OpenStreetMap</a> contributors</span>
          </div>
        </div>

        <!-- 2. ASSIGNED DELIVERY STOPS LIST -->
        <h3 style="font-size: 1.1rem; font-weight: 800; color: #0F172A; margin: 1.5rem 0 0.85rem 0; display: flex; justify-content: space-between; align-items: center;">
          <span>📍 Assigned Delivery Stops (${allStops.length})</span>
        </h3>

        <div style="display: flex; flex-direction: column; gap: 1rem;">
          ${allStops.map((stop, idx) => {
            const isDelivered = stop.status === 'Delivered';

            // GOOGLE MAPS DIRECTIONS URL MANDATORY SPECIFICATION
            const navDirectionsUrl = (stop.latitude && stop.longitude)
              ? `https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}&dir_action=navigate`
              : (stop.google_maps_url || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent((stop.store_name + ' ' + (stop.location || '') + ' ' + (stop.address || '')).trim())}&dir_action=navigate`);

            return `
              <div class="card" style="border-radius: 14px; border-top: 4px solid ${isDelivered ? '#10B981' : '#2563EB'}; background: ${isDelivered ? '#F0FDF4' : 'white'};">
                
                <!-- Stop Top Bar -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                  <div style="display: flex; align-items: center; gap: 0.6rem;">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background: ${isDelivered ? '#10B981' : '#2563EB'}; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem;">
                      ${stop.sequence || (idx + 1)}
                    </div>
                    <div>
                      <h4 style="font-size: 1.1rem; font-weight: 800; color: #0F172A; margin: 0;">${stop.store_name}</h4>
                      <div style="font-size: 0.8rem; color: #64748B;">📍 ${stop.location || 'Coimbatore Area'}</div>
                    </div>
                  </div>

                  <span class="badge ${isDelivered ? 'badge-delivered' : 'badge-pending'}" style="font-size: 0.75rem;">
                    ${isDelivered ? '✅ Delivered' : '⏳ Pending Delivery'}
                  </span>
                </div>

                <!-- Address & Driver Notes -->
                ${stop.address ? `
                  <div style="font-size: 0.825rem; color: #475569; margin-bottom: 0.6rem; background: rgba(241, 245, 249, 0.6); padding: 0.5rem 0.75rem; border-radius: 6px;">
                    <strong>Address:</strong> ${stop.address}
                  </div>
                ` : ''}

                ${stop.driver_notes ? `
                  <div style="font-size: 0.825rem; color: #B45309; margin-bottom: 0.6rem; background: #FEF3C7; padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px solid #FDE68A;">
                    <strong>⚠️ Driver Note:</strong> ${stop.driver_notes}
                  </div>
                ` : ''}

                <!-- Deliverable Items List (ZERO PRICES) -->
                <div style="margin: 0.75rem 0; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 0.75rem;">
                  <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748B; margin-bottom: 0.4rem;">
                    Items to Deliver:
                  </div>
                  ${(!stop.items || stop.items.length === 0) ? `
                    <div style="font-size: 0.8rem; color: #94A3B8;">No items listed.</div>
                  ` : `
                    <div style="display: flex; flex-direction: column; gap: 0.35rem;">
                      ${stop.items.map(item => `
                        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; border-bottom: 1px dashed #E2E8F0; padding-bottom: 0.25rem;">
                          <span style="font-weight: 600; color: #1E293B;">${item.product_name}</span>
                          <span style="font-weight: 800; color: #2563EB;">${item.quantity} ${item.unit || 'Pkt'}</span>
                        </div>
                      `).join('')}
                    </div>
                  `}
                </div>

                <!-- Driver Actions Bar -->
                <div style="display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap;">
                  ${stop.phone ? `
                    <a href="tel:${stop.phone}" class="btn btn-secondary btn-sm" style="flex: 1; text-align: center; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 0.3rem;">
                      📞 Call Store
                    </a>
                  ` : ''}

                  <a href="${navDirectionsUrl}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm" style="flex: 1; text-align: center; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 0.3rem; background: #EFF6FF; color: #2563EB; border-color: #BFDBFE;">
                    📍 Directions (Google Maps)
                  </a>

                  ${!isDelivered ? `
                    <button class="btn btn-primary btn-sm btn-mark-stop-delivered" data-stop-id="${stop.id}" style="flex: 1; background: #10B981; border-color: #059669;">
                      ✅ Mark Delivered
                    </button>
                  ` : `
                    <button class="btn btn-secondary btn-sm btn-mark-stop-pending" data-stop-id="${stop.id}" style="padding: 0.3rem 0.6rem; font-size: 0.75rem; color: #64748B;">
                      Undo
                    </button>
                  `}
                </div>

              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;
  },

  initLeafletMap(deliveryRuns = []) {
    if (typeof window.L === 'undefined') return;
    const container = document.getElementById('driver-route-map');
    if (!container) return;

    const allStops = [];
    deliveryRuns.forEach(run => {
      if (run.stops && Array.isArray(run.stops)) {
        allStops.push(...run.stops);
      }
    });

    const mappedStops = allStops.filter(s => s.latitude && s.longitude);
    if (mappedStops.length === 0) return;

    let centerLat = mappedStops[0].latitude;
    let centerLng = mappedStops[0].longitude;

    try {
      const map = window.L.map('driver-route-map').setView([centerLat, centerLng], 12);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      const bounds = [];

      mappedStops.forEach((stop, idx) => {
        const lat = Number(stop.latitude);
        const lng = Number(stop.longitude);
        bounds.push([lat, lng]);
        
        const isDelivered = stop.status === 'Delivered';

        const popupContent = `
          <div style="font-family: sans-serif; padding: 0.2rem;">
            <div style="font-size: 0.75rem; color: #64748B; margin-bottom: 0.2rem;">Stop ${stop.sequence || (idx + 1)}</div>
            <strong style="font-size: 1rem; color: #0F172A;">${stop.store_name}</strong>
            <div style="font-size: 0.8rem; color: #64748B; margin-top: 0.2rem;">📍 ${stop.location || 'Location'}</div>
            <div style="margin-top: 0.6rem;">
              <span style="font-size: 0.75rem; background: ${isDelivered ? '#10B981' : '#F59E0B'}; color: white; padding: 0.25rem 0.5rem; border-radius: 4px;">
                ${isDelivered ? '✅ Delivered' : '⏳ Pending'}
              </span>
            </div>
          </div>
        `;

        // Create a custom icon for driver stops
        const markerIcon = window.L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="background-color: ${isDelivered ? '#10B981' : '#2563EB'}; width: 24px; height: 24px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${stop.sequence || (idx + 1)}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        window.L.marker([lat, lng], { icon: markerIcon }).addTo(map).bindPopup(popupContent);
      });

      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [30, 30] });
      }
    } catch(e) {
      console.warn('Leaflet map initialization skipped or re-rendered:', e);
    }
  }
};
