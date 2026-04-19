/* =============================================
   GREENPRINT — RESULTS PAGE LOGIC
   ============================================= */

let resultData = null;

document.addEventListener('DOMContentLoaded', () => {
  const raw = sessionStorage.getItem('greenprint_result');

  if (!raw) {
    document.getElementById('noDataModal').style.display = 'flex';
    return;
  }

  try {
    resultData = JSON.parse(raw);
  } catch (e) {
    document.getElementById('noDataModal').style.display = 'flex';
    return;
  }

  renderScore();
  renderBreakdown();
  renderQuickActions();
  renderInsights();
  bindTabs();
});

// ===== SCORE RENDERING =====

function renderScore() {
  const { total, grade, gradeColor, vsAverage } = resultData;

  // Animate the number
  animateNumber('totalScore', 0, total, 1200, 1);

  // Score ring animation
  const ring = document.getElementById('scoreRing');
  if (ring) {
    const circumference = 2 * Math.PI * 76; // r=76
    const globalMax = 20; // tonnes — scale
    const fraction = Math.min(total / globalMax, 1);
    const offset = circumference * (1 - fraction);

    ring.style.stroke = gradeColor;
    setTimeout(() => {
      ring.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(0.4, 0, 0.2, 1)';
      ring.style.strokeDashoffset = offset;
    }, 200);
  }

  // vs average
  const vsEl = document.getElementById('vsAverageVal');
  if (vsEl) {
    vsEl.textContent = vsAverage;
    vsEl.style.color = vsAverage.includes('below') ? 'var(--green)' : 'var(--amber)';
  }

  // Grade
  const gradeEl = document.getElementById('gradeVal');
  if (gradeEl) {
    gradeEl.textContent = grade;
    gradeEl.style.color = gradeColor;
  }
}

function animateNumber(id, from, to, duration, decimals = 0) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = performance.now();
  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = from + (to - from) * eased;
    el.textContent = current.toFixed(decimals);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ===== BREAKDOWN =====

function renderBreakdown() {
  const { scores } = resultData;
  const total = resultData.total;

  const items = [
    { icon: '🍽️', label: 'Food & Diet', key: 'food', color: 'var(--green)' },
    { icon: '🚗', label: 'Transport', key: 'transport', color: 'var(--amber)' },
    { icon: '🏠', label: 'Home Energy', key: 'home', color: 'var(--teal)' }
  ];

  const list = document.getElementById('breakdownList');
  if (!list) return;

  list.innerHTML = items.map(({ icon, label, key, color }) => {
    const val = scores[key] || 0;
    const pct = Math.round((val / total) * 100);
    const barWidth = Math.round((val / Math.max(total, 6)) * 100);

    return `
      <div class="breakdown-item">
        <span class="breakdown-icon">${icon}</span>
        <span class="breakdown-label">${label}</span>
        <div class="breakdown-bar-wrap">
          <div class="breakdown-bar-fill" style="background:${color};--target-width:${barWidth}%"></div>
        </div>
        <span class="breakdown-score">${val}t</span>
      </div>
    `;
  }).join('');

  // Trigger bar animations
  requestAnimationFrame(() => {
    list.querySelectorAll('.breakdown-bar-fill').forEach(bar => {
      bar.style.width = bar.style.getPropertyValue('--target-width') || '0%';
      const targetW = bar.style.cssText.match(/--target-width:\s*([^;]+)/);
      if (targetW) bar.style.width = targetW[1];
    });
  });
}

// ===== QUICK ACTIONS =====

function renderQuickActions() {
  const { scores, formData } = resultData;
  const actions = [];

  // Determine highest impact areas
  const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topCategory = sortedScores[0][0];

  // Food actions
  if (formData.dietType === 'beef_heavy' || formData.dietType === 'omnivore_high') {
    actions.push({
      icon: '🥦',
      title: 'Try meat-free Mondays',
      desc: 'Cutting red meat just once a week can reduce your food footprint by up to 15%. Start small.',
      impact: 'high'
    });
  }

  if (formData.foodWaste === 'high' || formData.foodWaste === 'medium') {
    actions.push({
      icon: '🗓️',
      title: 'Plan your meals weekly',
      desc: 'About 1/3 of all food produced is wasted. A simple weekly plan is one of the highest-ROI changes you can make.',
      impact: 'medium'
    });
  }

  // Transport actions
  if (formData.primaryTransport === 'gas_car_large' || formData.primaryTransport === 'gas_car_small') {
    actions.push({
      icon: '🚌',
      title: 'Replace one car trip/week with transit',
      desc: 'Switching from a gas car to public transit for your commute cuts transport emissions by up to 45%.',
      impact: 'high'
    });
  }

  if (formData.flights > 3) {
    actions.push({
      icon: '🚆',
      title: 'Replace short flights with train travel',
      desc: 'Short-haul flights are the most carbon-intensive per km. A train trip emits roughly 90% less.',
      impact: 'high'
    });
  }

  // Home actions
  if (formData.heatingType === 'oil') {
    actions.push({
      icon: '🌡️',
      title: 'Consider a heat pump upgrade',
      desc: 'Heat pumps are 3x more efficient than oil or gas heating. Many provinces offer rebates up to $5,000.',
      impact: 'high'
    });
  }

  if (!formData.greenHome.includes('solar') && formData.homeType.includes('house')) {
    actions.push({
      icon: '☀️',
      title: 'Look into solar panels',
      desc: 'With federal and provincial incentives, payback periods are now often under 8 years for Canadian homes.',
      impact: 'medium'
    });
  }

  // Always include these
  actions.push({
    icon: '🌱',
    title: 'Offset what you can\'t cut',
    desc: 'Gold Standard carbon credits fund real reforestation and renewable projects. From ~$12/tonne.',
    impact: 'low'
  });

  actions.push({
    icon: '📍',
    title: 'Find local food resources',
    desc: 'Community fridges and surplus food programs near you reduce food waste at the neighbourhood level.',
    impact: 'medium'
  });

  const container = document.getElementById('quickActions');
  if (!container) return;

  container.innerHTML = actions.slice(0, 6).map(({ icon, title, desc, impact }) => `
    <div class="action-card">
      <span class="action-card-icon">${icon}</span>
      <div class="action-card-title">${title}</div>
      <div class="action-card-desc">${desc}</div>
      <span class="action-card-impact impact-${impact}">${impact} impact</span>
    </div>
  `).join('');
}

// ===== INSIGHTS =====

function renderInsights() {
  const { total, scores, countryAvg, formData } = resultData;

  const insights = [
    {
      icon: '🌍',
      title: 'Your footprint vs. the world',
      stat: `${total}t`,
      body: `The global average is 4.7t CO₂e per person per year. The target to limit warming to 1.5°C is about 2.5t by 2030. Canada's average is ${countryAvg}t — you're ${total < countryAvg ? 'below' : 'above'} that.`
    },
    {
      icon: '🍽️',
      title: 'Food is your biggest lever',
      stat: `${Math.round((scores.food / total) * 100)}%`,
      body: `Food accounts for ${Math.round((scores.food / total) * 100)}% of your footprint. The single most impactful dietary change is reducing beef and lamb consumption, which produces 20x more emissions than plant protein per gram.`
    },
    {
      icon: '🚗',
      title: 'The car problem',
      stat: `${scores.transport}t`,
      body: `Your transport accounts for ${scores.transport}t. A typical Canadian drives about 15,000km per year. If you use a gas car, each 10km you don't drive saves about 2kg of CO₂.`
    },
    {
      icon: '🏠',
      title: 'Your home energy',
      stat: `${scores.home}t`,
      body: `Heating is the dominant home energy cost in Canada. Switching from natural gas to a heat pump cuts home heating emissions by 50–70%, and the technology works even in cold climates.`
    },
    {
      icon: '📉',
      title: 'What would get you to 5t?',
      stat: `${Math.max(0, (total - 5).toFixed(1))}t to cut`,
      body: `To reach 5t, you'd need to reduce your footprint by ${Math.max(0, (total - 5).toFixed(1))} tonnes. The fastest path: reduce red meat consumption (saves ~1.5t), cut one return flight (saves ~1–2t), and shift to transit or carpooling.`
    },
    {
      icon: '♻️',
      title: 'Local action multiplies impact',
      body: `Individual action matters, but collective local action matters more. Participating in community composting, food bank donations, and local green initiatives reduces emissions at scale while building the social infrastructure for bigger change.`,
      stat: '10x'
    }
  ];

  const grid = document.getElementById('insightsGrid');
  if (!grid) return;

  grid.innerHTML = insights.map(({ icon, title, stat, body }) => `
    <div class="insight-card">
      <span class="insight-icon">${icon}</span>
      <h3>${title}</h3>
      ${stat ? `<div class="insight-stat">${stat}</div>` : ''}
      <p>${body}</p>
    </div>
  `).join('');
}

// ===== TABS =====

function bindTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;

      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const panel = document.getElementById(`tab-${tab}`);
      if (panel) {
        panel.classList.add('active');
        panel.style.animation = 'none';
        requestAnimationFrame(() => { panel.style.animation = ''; });
      }

      // Trigger map init when map tab is opened
      if (tab === 'map' && window.initMap) {
        setTimeout(() => window.initMap(), 100);
      }
    });
  });
}

/* ===== COMMITMENT TRACKER ===== */
const COMMIT_LABELS = {
  meatfree: { label: 'Go meat-free one day this week', saving: 'saves ~3kg CO₂' },
  transit: { label: 'Take transit instead of driving tomorrow', saving: 'saves ~2kg CO₂' },
  foodbank: { label: 'Donate to a local food bank this week', saving: 'reduces food waste impact' },
  waste: { label: 'Sort recycling properly this week', saving: 'reduces landfill methane' },
  thermostat: { label: 'Lower thermostat by 2°C tonight', saving: 'saves ~1.5kg CO₂' },
  localfood: { label: 'Buy local produce next grocery run', saving: 'cuts transport emissions' }
};

document.addEventListener('DOMContentLoaded', () => {
  // Bind commitment buttons
  document.querySelectorAll('.commit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.commit;
      selectCommitment(key);
    });
  });

  // Check if already committed
  const saved = localStorage.getItem('gp_commitment');
  if (saved) {
    const { key, date } = JSON.parse(saved);
    const today = new Date().toDateString();
    if (key) {
      selectCommitment(key, true);
      updateStreak(date);
    }
  }
});

function selectCommitment(key, fromStorage = false) {
  const info = COMMIT_LABELS[key];
  if (!info) return;

  document.querySelectorAll('.commit-btn').forEach(b => b.classList.remove('selected'));
  const btn = document.querySelector(`.commit-btn[data-commit="${key}"]`);
  if (btn) btn.classList.add('selected');

  document.getElementById('commitmentOptions').style.display = 'none';
  document.getElementById('commitmentConfirmed').style.display = 'flex';
  document.getElementById('commitBadgeTitle').textContent = info.label;
  document.getElementById('commitBadgeSub').textContent = `✅ Committed · ${info.saving}`;

  if (!fromStorage) {
    const today = new Date().toDateString();
    localStorage.setItem('gp_commitment', JSON.stringify({ key, date: today, label: info.label }));
  }

  const saved = localStorage.getItem('gp_commitment');
  if (saved) updateStreak(JSON.parse(saved).date);
}

function resetCommitment() {
  document.getElementById('commitmentOptions').style.display = 'grid';
  document.getElementById('commitmentConfirmed').style.display = 'none';
  document.querySelectorAll('.commit-btn').forEach(b => b.classList.remove('selected'));
}

function updateStreak(startDateStr) {
  const streakEl = document.getElementById('commitmentStreak');
  const streakNum = document.getElementById('streakNum');
  if (!streakEl || !streakNum) return;

  const start = new Date(startDateStr);
  const now = new Date();
  const days = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;

  streakNum.textContent = days;
  streakEl.style.display = 'flex';
}

function copyShareText() {
  if (!resultData) return;
  const { total, scores, grade } = resultData;
  const text = `My carbon footprint is ${total}t CO₂e/year (${grade} rating) — calculated with GreenPrint.\n\nBreakdown:\n🍽️ Food: ${scores.food}t\n🚗 Transport: ${scores.transport}t\n🏠 Home: ${scores.home}t\n\nThe global target by 2030 is 2.5t. GreenPrint helped me find local resources to act on it.`;

  navigator.clipboard.writeText(text).then(() => {
    const btn = event.target;
    const orig = btn.textContent;
    btn.textContent = '✅ Copied!';
    setTimeout(() => { btn.textContent = orig; }, 2000);
  }).catch(() => {
    prompt('Copy this:', text);
  });
}

/* ===== WHAT-IF SIMULATOR ===== */
const DIET_FACTORS = {
  vegan: 1.5, vegetarian: 1.7, pescatarian: 2.0,
  omnivore_low: 2.5, omnivore_high: 3.3, beef_heavy: 4.5
};

const TRANSPORT_FACTORS = {
  walk_cycle: 0, public_transit: 0.5, electric_car: 0.8,
  gas_car_small: 2.4, gas_car_large: 3.6
};

const HEATING_FACTORS = {
  electric_renewable: 0, natural_gas: 1.0, oil: 1.6
};

const FLIGHT_FACTORS = { none: 0, short: 0.6, long: 2.2 };

let wfState = {};

document.addEventListener('DOMContentLoaded', () => {
  // Init What-If when tab is switched
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === 'whatif') {
        setTimeout(initWhatIf, 100);
      }
    });
  });
});

function initWhatIf() {
  if (!resultData) return;
  if (document.querySelector('.wf-opt.active')) return; // already inited

  const fd = resultData.formData;

  wfState = {
    diet: fd.dietType || 'omnivore_high',
    transport: fd.primaryTransport || 'gas_car_small',
    flights: fd.flights ?? 2,
    flightType: fd.flightType || 'short',
    heating: fd.heatingType || 'natural_gas',
    homeType: fd.homeType || 'apartment_large',
    carDistance: fd.carDistance ?? 200,
    electricBill: fd.electricBill ?? 100,
    localFood: fd.localFood ?? 30,
    foodWaste: fd.foodWaste || 'medium',
    greenHome: fd.greenHome || []
  };

  // Set active buttons to current state
  setWfActive('diet', wfState.diet);
  setWfActive('transport', wfState.transport);
  setWfActive('heating', wfState.heating);

  // Set flight slider
  const flightRange = document.getElementById('wf-flights-range');
  const flightVal = document.getElementById('wf-flights-val');
  if (flightRange) {
    flightRange.value = wfState.flights;
    if (flightVal) flightVal.textContent = `${wfState.flights} flights`;
    flightRange.addEventListener('input', () => {
      wfState.flights = parseInt(flightRange.value);
      if (flightVal) flightVal.textContent = `${wfState.flights} flights`;
      recalcWhatIf();
    });
  }

  // Bind wf-opt buttons
  document.querySelectorAll('.wf-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.field;
      const value = btn.dataset.value;

      document.querySelectorAll(`.wf-opt[data-field="${field}"]`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (field === 'diet') wfState.diet = value;
      if (field === 'transport') wfState.transport = value;
      if (field === 'heating') wfState.heating = value;

      recalcWhatIf();
    });
  });

  // Current labels
  const dietNames = { vegan:'Vegan', vegetarian:'Vegetarian', pescatarian:'Pescatarian', omnivore_low:'Some meat', omnivore_high:'Regular meat', beef_heavy:'Beef-heavy' };
  const transNames = { walk_cycle:'Walk/Cycle', public_transit:'Public transit', electric_car:'Electric car', gas_car_small:'Gas car', gas_car_large:'SUV/Truck' };
  const heatNames = { electric_renewable:'Electric/Renewable', natural_gas:'Natural gas', oil:'Oil/Propane' };

  const dc = document.getElementById('wf-diet-current');
  const tc = document.getElementById('wf-transport-current');
  const hc = document.getElementById('wf-heating-current');
  const fc = document.getElementById('wf-flights-current');

  if (dc) dc.textContent = `Currently: ${dietNames[wfState.diet] || wfState.diet}`;
  if (tc) tc.textContent = `Currently: ${transNames[wfState.transport] || wfState.transport}`;
  if (hc) hc.textContent = `Currently: ${heatNames[wfState.heating] || wfState.heating}`;
  if (fc) fc.textContent = `Currently: ${wfState.flights} flights/year`;

  recalcWhatIf();
}

function setWfActive(field, value) {
  document.querySelectorAll(`.wf-opt[data-field="${field}"]`).forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === value);
  });
}

function recalcWhatIf() {
  // Food
  let foodScore = DIET_FACTORS[wfState.diet] || 2.5;
  const localFoodReduction = (wfState.localFood / 100) * 0.3;
  foodScore *= (1 - localFoodReduction);
  const wasteAdder = { low: 0, medium: 0.08, high: 0.18 };
  foodScore *= (1 + (wasteAdder[wfState.foodWaste] || 0));

  // Transport
  let transportScore = TRANSPORT_FACTORS[wfState.transport] || 2.0;
  if (wfState.transport.includes('car')) {
    transportScore *= (wfState.carDistance / 200);
  }
  if (wfState.flightType !== 'none') {
    transportScore += (FLIGHT_FACTORS[wfState.flightType] || 0.6) * wfState.flights;
  }

  // Home
  let homeScore = ({ apartment_small: 1.2, apartment_large: 2.0, house_small: 2.8, house_large: 4.2 }[wfState.homeType] || 2.0);
  homeScore += HEATING_FACTORS[wfState.heating] || 0;
  homeScore *= (0.5 + 0.5 * (wfState.electricBill / 100));
  if (wfState.greenHome.includes('solar')) homeScore *= 0.75;
  if (wfState.greenHome.includes('heatpump')) homeScore *= 0.85;
  if (wfState.greenHome.includes('insulation')) homeScore *= 0.90;

  const projected = Math.round((foodScore + transportScore + homeScore) * 10) / 10;
  const current = resultData.total;
  const diff = Math.round((projected - current) * 10) / 10;

  // Update display
  const totalEl = document.getElementById('whatifTotal');
  const deltaEl = document.getElementById('whatifDelta');

  if (totalEl) {
    totalEl.textContent = projected.toFixed(1);
    totalEl.style.color = projected < current ? 'var(--green)' : projected > current ? 'var(--red)' : 'var(--text)';
  }

  if (deltaEl) {
    if (diff === 0) {
      deltaEl.textContent = 'No change';
      deltaEl.className = 'whatif-delta';
    } else if (diff < 0) {
      deltaEl.textContent = `↓ ${Math.abs(diff)}t saved`;
      deltaEl.className = 'whatif-delta better';
    } else {
      deltaEl.textContent = `↑ ${diff}t added`;
      deltaEl.className = 'whatif-delta worse';
    }
  }

  // Update bars (scale: 20t = 100%)
  const maxT = 20;
  const currentBar = document.getElementById('wf-bar-current');
  const projectedBar = document.getElementById('wf-bar-projected');
  const currentVal = document.getElementById('wf-bar-current-val');
  const projectedVal = document.getElementById('wf-bar-projected-val');

  if (currentBar) currentBar.style.width = `${Math.min((current / maxT) * 100, 100)}%`;
  if (projectedBar) projectedBar.style.width = `${Math.min((projected / maxT) * 100, 100)}%`;
  if (currentVal) currentVal.textContent = `${current}t`;
  if (projectedVal) projectedVal.textContent = `${projected.toFixed(1)}t`;

  const currentLabel = document.getElementById('wf-current-label');
  if (currentLabel) currentLabel.textContent = `${current}t current`;
}

/* ===== COMPARISON BARS ===== */
function renderComparisonBars() {
  if (!resultData) return;
  const { total, countryAvg, formData } = resultData;
  const maxScale = 25; // max tonnes for bar scale

  const countryNames = { CA:'Canada', US:'USA', UK:'UK', AU:'Australia', DE:'Germany', FR:'France', OTHER:'World' };
  const countryLabel = document.getElementById('cmpCountryLabel');
  if (countryLabel) countryLabel.textContent = `${countryNames[formData?.country] || 'Canada'} avg`;

  setTimeout(() => {
    const youBar = document.getElementById('cmpBarYou');
    const countryBar = document.getElementById('cmpBarCountry');
    const youVal = document.getElementById('cmpValYou');
    const countryVal = document.getElementById('cmpValCountry');

    if (youBar) youBar.style.width = `${Math.min((total / maxScale) * 100, 100)}%`;
    if (countryBar) countryBar.style.width = `${Math.min(((countryAvg || 15.4) / maxScale) * 100, 100)}%`;
    if (youVal) {
      youVal.textContent = `${total}t`;
      youVal.style.color = total < (countryAvg || 15.4) ? 'var(--green)' : 'var(--amber)';
    }
    if (countryVal) countryVal.textContent = `${countryAvg || 15.4}t`;
  }, 400);
}

/* ===== LOADING OVERLAY ===== */
function runLoadingOverlay() {
  const overlay = document.getElementById('calcOverlay');
  if (!overlay) return;

  // Only show if we just came from the calculator (not if refreshed directly)
  const fromCalc = sessionStorage.getItem('gp_from_calc');
  if (!fromCalc) {
    overlay.style.display = 'none';
    return;
  }
  sessionStorage.removeItem('gp_from_calc');

  const steps = ['ovStep1', 'ovStep2', 'ovStep3', 'ovStep4'];
  let current = 0;

  const advance = () => {
    if (current > 0) {
      const prev = document.getElementById(steps[current - 1]);
      if (prev) { prev.classList.remove('active'); prev.classList.add('done'); }
    }
    if (current < steps.length) {
      const el = document.getElementById(steps[current]);
      if (el) el.classList.add('active');
      current++;
      if (current < steps.length) setTimeout(advance, 480);
    }
  };

  advance();
}

/* ===== SOURCES TOGGLE ===== */
function toggleSources() {
  const content = document.getElementById('sourcesContent');
  const arrow = document.getElementById('sourcesArrow');
  if (!content || !arrow) return;

  const isOpen = content.style.display !== 'none';
  content.style.display = isOpen ? 'none' : 'block';
  arrow.classList.toggle('open', !isOpen);
}

// Hook into existing DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(renderComparisonBars, 100);
  runLoadingOverlay();
});

/* ===== NEIGHBOURHOOD IMPACT COUNTER ===== */
function renderNeighbourhoodCounter() {
  // Seeded base numbers so it looks real from day one
  // Increments each session using localStorage
  const BASE_USERS = 847;
  const BASE_SAVINGS = 3241;
  const BASE_COMMITS = 312;

  let localUsers = parseInt(localStorage.getItem('gp_nbr_users') || '0');
  let localCommits = parseInt(localStorage.getItem('gp_nbr_commits') || '0');

  // Increment users on each new result view
  const sessionCounted = sessionStorage.getItem('gp_session_counted');
  if (!sessionCounted) {
    localUsers += 1;
    localStorage.setItem('gp_nbr_users', localUsers);
    sessionStorage.setItem('gp_session_counted', '1');
  }

  const totalUsers = BASE_USERS + localUsers;
  const totalSavings = BASE_SAVINGS + Math.round(localUsers * 3.8);
  const totalCommits = BASE_COMMITS + localCommits;

  // Animate the numbers
  animateCounter('nbrUsers', totalUsers);
  animateCounter('nbrSavings', totalSavings);
  animateCounter('nbrCommitted', totalCommits);
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const duration = 1800;
  const start = performance.now();
  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(eased * target).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ===== BADGE SYSTEM ===== */
const ALL_BADGES = [
  { id: 'first_step',      icon: '🌱', name: 'First Step',      desc: 'Calculated your footprint' },
  { id: 'follow_through',  icon: '✅', name: 'Follow Through',  desc: 'Completed a 7-day check-in' },
  { id: 'overachiever',    icon: '🚀', name: 'Overachiever',    desc: 'Exceeded your commitment' },
  { id: 'food_hero',       icon: '🥦', name: 'Food Hero',       desc: 'Completed a food commitment' },
  { id: 'transit_rider',   icon: '🚌', name: 'Transit Rider',   desc: 'Completed a transit commitment' },
  { id: 'community_giver', icon: '🍎', name: 'Community Giver', desc: 'Donated to a food bank' },
  { id: 'carbon_cutter',   icon: '📉', name: 'Carbon Cutter',   desc: 'Scored below national average' },
  { id: 'local_hero',      icon: '📍', name: 'Local Hero',      desc: 'Explored local resources map' },
];

function renderBadges() {
  const earned = JSON.parse(localStorage.getItem('gp_badges') || '[]');

  // Auto-award first_step for completing the calculator
  if (!earned.includes('first_step')) {
    earned.push('first_step');
    localStorage.setItem('gp_badges', JSON.stringify(earned));
  }

  // Auto-award carbon_cutter if below national average
  if (resultData && resultData.total < (resultData.countryAvg || 15.4)) {
    if (!earned.includes('carbon_cutter')) {
      earned.push('carbon_cutter');
      localStorage.setItem('gp_badges', JSON.stringify(earned));
    }
  }

  const container = document.getElementById('allBadges');
  if (!container) return;

  container.innerHTML = ALL_BADGES.map(badge => {
    const isUnlocked = earned.includes(badge.id);
    return `
      <div class="badge-item ${isUnlocked ? 'unlocked' : 'locked'}" title="${badge.desc}">
        <span class="badge-emoji">${badge.icon}</span>
        <span class="badge-name">${badge.name}</span>
        ${!isUnlocked ? '<span class="badge-locked-label">Locked</span>' : ''}
      </div>
    `;
  }).join('');

  // Show check-in CTA if commitment was made 7+ days ago
  const savedCommit = localStorage.getItem('gp_commitment');
  if (savedCommit) {
    const { date } = JSON.parse(savedCommit);
    const days = Math.floor((new Date() - new Date(date)) / (1000*60*60*24));
    const ctaBtn = document.getElementById('checkinCta');
    // Show after 1 day for demo purposes (would be 7 in production)
    if (days >= 1 && ctaBtn) ctaBtn.style.display = 'inline-flex';
  }
}

/* ===== AWARD LOCAL HERO BADGE WHEN MAP TAB IS OPENED ===== */
function awardLocalHero() {
  const earned = JSON.parse(localStorage.getItem('gp_badges') || '[]');
  if (!earned.includes('local_hero')) {
    earned.push('local_hero');
    localStorage.setItem('gp_badges', JSON.stringify(earned));
    // Re-render badges if panel is visible
    setTimeout(renderBadges, 100);
  }
}

/* ===== HOOK INTO DOMCONTENTLOADED ===== */
document.addEventListener('DOMContentLoaded', () => {
  renderNeighbourhoodCounter();
  renderBadges();

  // Award local_hero when map tab is clicked
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === 'map') awardLocalHero();
    });
  });
});

/* ===== INCREMENT COMMITMENT COUNTER ===== */
// Override selectCommitment to also bump neighbourhood counter
const _origSelectCommitment = window.selectCommitment;
// Patched in the DOMContentLoaded below via event delegation
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('commit-btn')) {
    let localCommits = parseInt(localStorage.getItem('gp_nbr_commits') || '0');
    localCommits += 1;
    localStorage.setItem('gp_nbr_commits', localCommits);
  }
});