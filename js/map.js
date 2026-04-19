/* =============================================
   GREENPRINT — MAP & LOCAL RESOURCES
   Uses Leaflet.js + OpenStreetMap + Overpass API
   No API key required.
   ============================================= */

let map = null;
let mapInitialized = false;
let allMarkers = [];
let markerLayer = null;

// Resource type configs
const RESOURCE_TYPES = {
  food: {
    color: '#4ade80',
    label: 'Food Resource',
    badgeStyle: 'background:rgba(74,222,128,0.15);color:#4ade80;border:1px solid rgba(74,222,128,0.25)'
  },
  recycling: {
    color: '#2dd4bf',
    label: 'Recycling',
    badgeStyle: 'background:rgba(45,212,191,0.15);color:#2dd4bf;border:1px solid rgba(45,212,191,0.25)'
  },
  green: {
    color: '#fbbf24',
    label: 'Green Org',
    badgeStyle: 'background:rgba(251,191,36,0.15);color:#fbbf24;border:1px solid rgba(251,191,36,0.25)'
  }
};

// Overpass API query builder
function buildOverpassQuery(lat, lng, radius = 5000) {
  return `
    [out:json][timeout:25];
    (
      node["amenity"="food_bank"](around:${radius},${lat},${lng});
      node["amenity"="community_fridge"](around:${radius},${lat},${lng});
      node["social_facility"="food_bank"](around:${radius},${lat},${lng});
      node["social_facility"="soup_kitchen"](around:${radius},${lat},${lng});
      node["recycling:glass"="yes"](around:${radius},${lat},${lng});
      node["amenity"="recycling"](around:${radius},${lat},${lng});
      node["amenity"="waste_disposal"](around:${radius},${lat},${lng});
      node["landuse"="community_garden"](around:${radius},${lat},${lng});
      way["landuse"="community_garden"](around:${radius},${lat},${lng});
      node["leisure"="garden"]["garden:type"="community"](around:${radius},${lat},${lng});
      node["office"="ngo"]["environment"="yes"](around:${radius},${lat},${lng});
      node["amenity"="social_centre"](around:${radius},${lat},${lng});
    );
    out center;
  `;
}

// Classify a node into resource type
function classifyNode(node) {
  const tags = node.tags || {};

  if (
    tags.amenity === 'food_bank' ||
    tags.amenity === 'community_fridge' ||
    tags.social_facility === 'food_bank' ||
    tags.social_facility === 'soup_kitchen'
  ) return 'food';

  if (
    tags.amenity === 'recycling' ||
    tags['recycling:glass'] === 'yes' ||
    tags.amenity === 'waste_disposal'
  ) return 'recycling';

  return 'green';
}

// Get human-readable name for a node
function getNodeName(node) {
  const tags = node.tags || {};
  if (tags.name) return tags.name;

  const typeMap = {
    food_bank: 'Food Bank',
    community_fridge: 'Community Fridge',
    soup_kitchen: 'Soup Kitchen',
    recycling: 'Recycling Depot',
    waste_disposal: 'Waste Disposal',
    community_garden: 'Community Garden',
    social_centre: 'Community Centre'
  };

  return (
    typeMap[tags.amenity] ||
    typeMap[tags.social_facility] ||
    typeMap[tags.landuse] ||
    typeMap[tags.leisure] ||
    'Local Resource'
  );
}

function getNodeDescription(node) {
  const tags = node.tags || {};
  const parts = [];

  if (tags['opening_hours']) parts.push(`Hours: ${tags['opening_hours']}`);
  if (tags['phone']) parts.push(`Phone: ${tags['phone']}`);
  if (tags['website']) parts.push(`<a href="${tags['website']}" target="_blank" style="color:var(--green)">Visit website</a>`);
  if (tags['addr:street']) {
    const addr = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].filter(Boolean).join(' ');
    if (addr) parts.push(addr);
  }

  const type = classifyNode(node);
  const defaultDesc = {
    food: 'Provides food assistance to community members.',
    recycling: 'Drop-off point for recyclable materials.',
    green: 'Local green initiative or community space.'
  };

  return parts.length > 0 ? parts.join(' · ') : defaultDesc[type];
}

// Create a custom circular marker
function createMarkerIcon(color) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: ${color};
        border: 3px solid rgba(10,15,13,0.8);
        box-shadow: 0 2px 12px rgba(0,0,0,0.5), 0 0 0 2px ${color}40;
        transition: transform 0.2s;
      "></div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16]
  });
}

// ===== GEOCODE LOCATION =====
async function geocodeLocation(location) {
  if (!location) return null;

  try {
    const encoded = encodeURIComponent(location);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name };
    }
  } catch (e) {
    console.warn('Geocoding failed:', e);
  }
  return null;
}

// ===== FETCH RESOURCES FROM OVERPASS =====
async function fetchResources(lat, lng) {
  const query = buildOverpassQuery(lat, lng, 6000);
  const encoded = encodeURIComponent(query);

  try {
    const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encoded}`);
    const data = await res.json();
    return data.elements || [];
  } catch (e) {
    console.warn('Overpass fetch failed:', e);
    return [];
  }
}

// ===== ADD FALLBACK DEMO RESOURCES =====
// Shows example resources if Overpass returns nothing (useful for demos)
function getFallbackResources(lat, lng) {
  const offsets = [
    [0.012, 0.008, 'food', 'Cambridge Community Food Bank', 'Open Mon-Fri 9am-4pm · Serves anyone in need'],
    [-0.008, 0.015, 'food', 'Community Fridge - Hespeler', 'Take what you need, leave what you can. Open 24/7'],
    [0.005, -0.012, 'recycling', 'Waste Management Depot', 'Accepts e-waste, glass, plastics 1-7, metals'],
    [-0.015, -0.006, 'recycling', 'Region of Waterloo Recycling', 'Municipal recycling drop-off · Open weekdays'],
    [0.018, 0.003, 'green', 'Cambridge Community Garden', 'Seasonal plots available · Contact city for waitlist'],
    [-0.003, 0.020, 'green', 'Sustainable Waterloo Region', 'Local climate action org · Events and programs'],
    [0.009, -0.018, 'food', 'YES Food Bank', 'Youth-led food program, all welcome · Fridays 2-5pm'],
    [-0.012, 0.011, 'green', 'Grand River Conservation Authority', 'Conservation education and green spaces']
  ];

  return offsets.map(([dlat, dlng, type, name, desc]) => ({
    lat: lat + dlat,
    lng: lng + dlng,
    type,
    name,
    desc,
    isFallback: true
  }));
}

// ===== INIT MAP =====
window.initMap = async function() {
  if (mapInitialized) return;
  mapInitialized = true;

  const raw = sessionStorage.getItem('greenprint_result');
  let userLat = 43.3616, userLng = -80.3144; // Default: Cambridge, ON
  let locationLabel = 'Cambridge, ON';

  if (raw) {
    const data = JSON.parse(raw);
    const loc = data.formData?.location;

    if (loc) {
      const geo = await geocodeLocation(loc);
      if (geo) {
        userLat = geo.lat;
        userLng = geo.lng;
        locationLabel = loc;
      }
    }
  }

  // Initialize Leaflet map
  map = L.map('map', {
    center: [userLat, userLng],
    zoom: 13,
    zoomControl: true,
    scrollWheelZoom: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
    maxZoom: 18
  }).addTo(map);

  // User location marker
  const userIcon = L.divIcon({
    className: '',
    html: `<div style="
      width: 20px; height: 20px;
      border-radius: 50%;
      background: white;
      border: 4px solid #4ade80;
      box-shadow: 0 0 0 4px rgba(74,222,128,0.2), 0 2px 8px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  L.marker([userLat, userLng], { icon: userIcon })
    .addTo(map)
    .bindPopup(`<strong>📍 Your Location</strong><br>${locationLabel}`);

  markerLayer = L.layerGroup().addTo(map);

  // Fetch and display resources
  let resources = await fetchResources(userLat, userLng);

  // Use fallback if nothing found
  let usedFallback = false;
  if (resources.length < 3) {
    resources = getFallbackResources(userLat, userLng);
    usedFallback = true;
  }

  if (usedFallback) {
    const notice = document.createElement('div');
    notice.style.cssText = `
      background: rgba(251,191,36,0.1);
      border: 1px solid rgba(251,191,36,0.2);
      border-radius: 10px;
      padding: 12px 16px;
      font-size: 13px;
      color: #fbbf24;
      margin-bottom: 16px;
    `;
    notice.textContent = '📍 Showing example resources. In a real deployment, this pulls live data from OpenStreetMap for your exact location.';
    document.getElementById('resourceList')?.before(notice);
  }

  displayResources(resources, usedFallback);
  bindMapFilters(resources, usedFallback);
};

// ===== DISPLAY RESOURCES =====
function displayResources(resources, isFallback = false) {
  markerLayer.clearLayers();
  allMarkers = [];

  const listEl = document.getElementById('resourceList');
  if (listEl) listEl.innerHTML = '';

  resources.forEach((node, i) => {
    let lat, lng, type, name, desc;

    if (isFallback || node.lat !== undefined) {
      // Processed fallback format
      lat = node.lat;
      lng = node.lng;
      type = node.type;
      name = node.name;
      desc = node.desc;
    } else {
      // Raw Overpass node
      lat = node.lat || node.center?.lat;
      lng = node.lon || node.center?.lon;
      if (!lat || !lng) return;
      type = classifyNode(node);
      name = getNodeName(node);
      desc = getNodeDescription(node);
    }

    if (!lat || !lng) return;

    const config = RESOURCE_TYPES[type] || RESOURCE_TYPES.green;
    const marker = L.marker([lat, lng], { icon: createMarkerIcon(config.color) });

    marker.bindPopup(`
      <strong>${name}</strong>
      <span style="font-size:11px;padding:2px 6px;border-radius:10px;${config.badgeStyle};display:inline-block;margin:4px 0 6px">${config.label}</span><br>
      ${desc}
    `);

    marker.addTo(markerLayer);
    allMarkers.push({ marker, type, name, desc, config });

    // Add to list
    if (listEl && allMarkers.length <= 12) {
      const card = document.createElement('div');
      card.className = 'resource-card';
      card.dataset.type = type;
      card.innerHTML = `
        <div class="resource-card-header">
          <span class="resource-type-badge" style="${config.badgeStyle}">${config.label}</span>
        </div>
        <h4>${name}</h4>
        <p>${desc}</p>
      `;
      card.addEventListener('click', () => {
        map.setView([lat, lng], 15);
        marker.openPopup();
      });
      listEl.appendChild(card);
    }
  });
}

// ===== FILTER CONTROLS =====
function bindMapFilters(resources, isFallback) {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterType = btn.dataset.type;

      // Filter markers
      allMarkers.forEach(({ marker, type }) => {
        if (filterType === 'all' || type === filterType) {
          if (!markerLayer.hasLayer(marker)) markerLayer.addLayer(marker);
        } else {
          markerLayer.removeLayer(marker);
        }
      });

      // Filter resource cards
      document.querySelectorAll('.resource-card').forEach(card => {
        if (filterType === 'all' || card.dataset.type === filterType) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}
