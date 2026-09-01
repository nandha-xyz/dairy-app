import { storesRepository } from '../repositories/index.js';
import { workflowEngine } from '../services/workflowEngine.js';

export const adminStoreMapView = {
  render(selectedDate = workflowEngine.getTodayString(), activeFilter = 'all') {
    const stores = storesRepository.getAll();

    const filteredStores = stores.filter(store => {
      if (activeFilter === 'geolocated') return store.latitude && store.longitude;
      if (activeFilter === 'missing-coords') return !store.latitude || !store.longitude;
      return true;
    });

    const mappedStores = stores.filter(s => s.latitude && s.longitude);

    return `
      <div style="max-width: 1100px; margin: 0 auto; padding: 0.5rem 0;">
        
        <!-- Header & Action Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-main); margin: 0;">🗺️ Store Geolocation & Interactive Map</h2>
            <p style="font-size: 0.875rem; color: var(--text-muted); margin: 0.25rem 0 0 0;">
              Embedded open-source map view of retail distribution partners with Leaflet & OpenStreetMap
            </p>
          </div>

          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm filter-map-btn ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">
              All Stores (${stores.length})
            </button>
            <button class="btn btn-secondary btn-sm filter-map-btn ${activeFilter === 'geolocated' ? 'active' : ''}" data-filter="geolocated">
              📍 Mapped (${mappedStores.length})
            </button>
            <button class="btn btn-secondary btn-sm filter-map-btn ${activeFilter === 'missing-coords' ? 'active' : ''}" data-filter="missing-coords">
              ⚠️ Missing Coords (${stores.length - mappedStores.length})
            </button>
          </div>
        </div>

        <!-- EMBEDDED LEAFLET.JS OPEN-SOURCE MAP CONTAINER WITH VISIBLE ATTRIBUTION -->
        <div class="card" style="padding: 0; overflow: hidden; margin-bottom: 1.5rem; border-radius: 12px; border: 1px solid var(--border-color); box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div id="leaflet-store-map" style="height: 380px; width: 100%; background: #E2E8F0; z-index: 1;"></div>
          <div style="padding: 0.5rem 1rem; background: #F8FAFC; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: #64748B;">
            <span>📍 Map Markers: <strong>${mappedStores.length} stores geolocated</strong></span>
            <span>Map Data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener" style="color: #2563EB;">OpenStreetMap</a> contributors</span>
          </div>
        </div>

        ${filteredStores.length === 0 ? `
          <div class="empty-state" style="padding: 3rem 1.5rem;">
            <div class="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>
            <h3>No store locations match this filter</h3>
            <p>Select another filter or add latitude/longitude coordinates to your stores.</p>
          </div>
        ` : `
          <!-- Stores Geolocation Grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem;">
            ${filteredStores.map(store => {
              const hasCoords = store.latitude && store.longitude;
              const navDirectionsUrl = hasCoords
                ? `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}&dir_action=navigate`
                : (store.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((store.name + ' ' + (store.location || '') + ' ' + (store.address || '')).trim())}`);

              return `
                <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; border-top: 4px solid ${hasCoords ? '#2563EB' : '#F59E0B'};">
                  <div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                      <div>
                        <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); font-family: monospace;">${store.code}</span>
                        <h3 style="font-size: 1.1rem; font-weight: 700; color: #0F172A; margin: 0.1rem 0 0.25rem 0;">${store.name}</h3>
                        <div style="font-size: 0.85rem; color: #64748B;">📍 ${store.location || 'Coimbatore'}</div>
                      </div>
                      <span class="badge ${hasCoords ? 'badge-confirmed' : 'badge-pending'}" style="font-size: 0.7rem;">
                        ${hasCoords ? '📍 Geocoded' : '⚠️ No Coords'}
                      </span>
                    </div>

                    <div style="font-size: 0.825rem; color: #475569; margin-bottom: 0.75rem; background: #F8FAFC; padding: 0.6rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid #E2E8F0;">
                      <div><strong>Address:</strong> ${store.address || 'Address not specified'}</div>
                      ${store.contactPerson ? `<div><strong>Contact:</strong> ${store.contactPerson} (${store.phone || 'No phone'})</div>` : ''}
                      ${store.driverNotes ? `<div style="margin-top: 0.3rem; color: #B45309;"><strong>Driver Note:</strong> ${store.driverNotes}</div>` : ''}
                    </div>

                    <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; font-family: monospace; font-size: 0.75rem; color: #334155; flex-wrap: wrap;">
                      <div style="background: #EFF6FF; padding: 0.25rem 0.5rem; border-radius: 4px; border: 1px solid #BFDBFE;">
                        Lat: <strong>${store.latitude || 'N/A'}</strong>
                      </div>
                      <div style="background: #EFF6FF; padding: 0.25rem 0.5rem; border-radius: 4px; border: 1px solid #BFDBFE;">
                        Lng: <strong>${store.longitude || 'N/A'}</strong>
                      </div>
                    </div>
                  </div>

                  <div style="display: flex; gap: 0.5rem; border-top: 1px solid var(--border-color); margin-top: 0.5rem; padding-top: 0.75rem;">
                    <a href="${navDirectionsUrl}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm" style="flex: 1; text-align: center; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 0.3rem;">
                      <span>🗺️ Directions</span>
                    </a>
                    <button class="btn btn-secondary btn-sm btn-edit-store" data-store-id="${store.id}" style="padding: 0.35rem 0.65rem;">
                      ✏️ Edit Coords
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  },

  initLeafletMap() {
    if (typeof window.L === 'undefined') return;
    const container = document.getElementById('leaflet-store-map');
    if (!container) return;

    const stores = storesRepository.getAll();
    const mappedStores = stores.filter(s => s.latitude && s.longitude);

    // Default center: Coimbatore, Tamil Nadu (11.0168, 76.9558)
    let centerLat = 11.0168;
    let centerLng = 76.9558;

    if (mappedStores.length > 0) {
      centerLat = mappedStores[0].latitude;
      centerLng = mappedStores[0].longitude;
    }

    try {
      const map = window.L.map('leaflet-store-map').setView([centerLat, centerLng], 12);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      const bounds = [];

      mappedStores.forEach(store => {
        const lat = Number(store.latitude);
        const lng = Number(store.longitude);
        bounds.push([lat, lng]);

        const popupContent = `
          <div style="font-family: sans-serif; padding: 0.2rem;">
            <strong style="font-size: 1rem; color: #0F172A;">${store.name}</strong>
            <div style="font-size: 0.8rem; color: #64748B; margin-top: 0.2rem;">📍 ${store.location || 'Location'}</div>
            ${store.address ? `<div style="font-size: 0.75rem; color: #475569; margin-top: 0.3rem;">${store.address}</div>` : ''}
            <div style="margin-top: 0.6rem;">
              <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&dir_action=navigate" target="_blank" rel="noopener" style="font-size: 0.75rem; background: #2563EB; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; text-decoration: none; display: inline-block;">
                🗺️ Navigate Directions
              </a>
            </div>
          </div>
        `;

        window.L.marker([lat, lng]).addTo(map).bindPopup(popupContent);
      });

      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [30, 30] });
      }

      // --- LIVE DRIVER TRACKING ---
      if (window.supabase) {
        const { driverTrackingRepository } = await import('../repositories/index.js');
        const driverLocations = await driverTrackingRepository.getAllLocations();
        
        const driverMarkers = {};
        const truckIcon = window.L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="background-color: #3B82F6; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-size: 16px;">🚛</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const addOrUpdateDriverMarker = (loc) => {
          const lat = Number(loc.latitude);
          const lng = Number(loc.longitude);
          if (driverMarkers[loc.driver_id]) {
            driverMarkers[loc.driver_id].setLatLng([lat, lng]);
          } else {
            const marker = window.L.marker([lat, lng], { icon: truckIcon, zIndexOffset: 1000 }).addTo(map);
            marker.bindPopup(`<strong>🚛 Driver Location</strong><br>Last seen: ${new Date(loc.updated_at).toLocaleTimeString()}`);
            driverMarkers[loc.driver_id] = marker;
          }
        };

        driverLocations.forEach(addOrUpdateDriverMarker);

        // Subscribe to Realtime updates
        window.supabase.channel('driver-locations-channel')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_locations' }, payload => {
            const newLoc = payload.new;
            if (newLoc && newLoc.latitude && newLoc.longitude) {
              addOrUpdateDriverMarker(newLoc);
            }
          })
          .subscribe();
      }

    } catch(e) {
      console.warn('Leaflet map initialization skipped or re-rendered:', e);
    }
  }
};
