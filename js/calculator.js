/* =============================================
   GREENPRINT — CALCULATOR LOGIC
   ============================================= */

let currentStep = 1;
const totalSteps = 4;

// ===== CARBON EMISSION FACTORS =====
// All values in tonnes CO2e per year unless noted
const EMISSION_FACTORS = {
  diet: {
    vegan: 1.5,
    vegetarian: 1.7,
    pescatarian: 2.0,
    omnivore_low: 2.5,
    omnivore_high: 3.3,
    beef_heavy: 4.5
  },
  transport: {
    walk_cycle: 0,
    public_transit: 0.5,
    electric_car: 0.8,    // includes grid electricity
    gas_car_small: 2.4,
    gas_car_large: 3.6
  },
  flights: {
    none: 0,
    short: 0.6,   // per flight
    long: 2.2     // per flight
  },
  home: {
    apartment_small: 1.2,
    apartment_large: 2.0,
    house_small: 2.8,
    house_large: 4.2
  },
  heating: {
    electric_renewable: 0,
    natural_gas: 1.0,
    oil: 1.6
  }
};

// Country averages (tonnes CO2e/yr per capita)
const COUNTRY_AVERAGES = {
  CA: 15.4,
  US: 15.0,
  UK: 5.5,
  AU: 15.1,
  DE: 9.4,
  FR: 6.6,
  OTHER: 7.0
};

// ===== FORM STATE =====
const formData = {
  country: 'CA',
  householdSize: 1,
  location: '',
  dietType: 'omnivore_high',
  localFood: 30,
  foodWaste: 'medium',
  primaryTransport: 'gas_car_small',
  carDistance: 200,
  flights: 2,
  flightType: 'short',
  homeType: 'apartment_large',
  heatingType: 'natural_gas',
  electricBill: 100,
  greenHome: []
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  bindCardOptions();
  bindNumberButtons();
  bindRangeSliders();
  bindSelectInputs();
  bindTextInputs();
  bindCheckboxes();
  updateNavButtons();
});

// ===== BINDING FUNCTIONS =====

function bindCardOptions() {
  document.querySelectorAll('[data-card-group], .card-options').forEach(group => {
    group.querySelectorAll('.card-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.card-opt').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const groupId = group.id;
        if (groupId) formData[groupId] = btn.dataset.value;
      });
    });
  });
}

function bindNumberButtons() {
  document.querySelectorAll('.number-buttons').forEach(group => {
    group.querySelectorAll('.num-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.num-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const groupId = group.id;
        if (groupId) formData[groupId] = parseInt(btn.dataset.value) || btn.dataset.value;
      });
    });
  });
}

function bindRangeSliders() {
  const sliders = [
    { id: 'localFood', displayId: 'localFoodVal', suffix: '%' },
    { id: 'carDistance', displayId: 'carDistanceVal', suffix: ' km' },
    { id: 'flights', displayId: 'flightsVal', suffix: ' flights' },
    { id: 'electricBill', displayId: 'electricBillVal', prefix: '$' }
  ];

  sliders.forEach(({ id, displayId, suffix = '', prefix = '' }) => {
    const el = document.getElementById(id);
    const disp = document.getElementById(displayId);
    if (!el || !disp) return;

    el.addEventListener('input', () => {
      const val = el.value;
      disp.textContent = `${prefix}${val}${suffix}`;
      formData[id] = parseFloat(val);
    });
  });
}

function bindSelectInputs() {
  const countryEl = document.getElementById('country');
  if (countryEl) {
    countryEl.addEventListener('change', () => {
      formData.country = countryEl.value;
    });
  }
}

function bindTextInputs() {
  const locationEl = document.getElementById('location');
  if (locationEl) {
    locationEl.addEventListener('input', () => {
      formData.location = locationEl.value;
    });
  }
}

function bindCheckboxes() {
  const greenHomeGroup = document.getElementById('greenHome');
  if (!greenHomeGroup) return;

  greenHomeGroup.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const checked = Array.from(greenHomeGroup.querySelectorAll('input:checked')).map(i => i.value);
      formData.greenHome = checked;
    });
  });
}

// ===== STEP NAVIGATION =====

function nextStep() {
  if (currentStep === totalSteps) {
    submitForm();
    return;
  }

  const current = document.getElementById(`step${currentStep}`);
  current.classList.remove('active');

  // Mark sidebar step as done
  const progStep = document.querySelector(`.prog-step[data-step="${currentStep}"]`);
  if (progStep) {
    progStep.classList.remove('active');
    progStep.classList.add('done');
    const line = progStep.nextElementSibling;
    if (line && line.classList.contains('prog-line')) line.classList.add('done');
  }

  currentStep++;

  const next = document.getElementById(`step${currentStep}`);
  if (next) {
    next.classList.add('active');
    next.style.animation = 'none';
    requestAnimationFrame(() => { next.style.animation = ''; });
  }

  const nextProgStep = document.querySelector(`.prog-step[data-step="${currentStep}"]`);
  if (nextProgStep) nextProgStep.classList.add('active');

  // Update progress bar
  const fill = document.getElementById('progressFill');
  if (fill) fill.style.width = `${(currentStep / totalSteps) * 100}%`;

  // Update step label
  const label = document.getElementById('stepLabel');
  if (label) label.textContent = `Step ${currentStep} of ${totalSteps}`;

  updateNavButtons();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prevStep() {
  if (currentStep === 1) return;

  const current = document.getElementById(`step${currentStep}`);
  current.classList.remove('active');

  const progStep = document.querySelector(`.prog-step[data-step="${currentStep}"]`);
  if (progStep) progStep.classList.remove('active');

  currentStep--;

  const prev = document.getElementById(`step${currentStep}`);
  if (prev) prev.classList.add('active');

  const prevProgStep = document.querySelector(`.prog-step[data-step="${currentStep}"]`);
  if (prevProgStep) {
    prevProgStep.classList.remove('done');
    prevProgStep.classList.add('active');
    const line = prevProgStep.nextElementSibling;
    if (line && line.classList.contains('prog-line')) line.classList.remove('done');
  }

  const fill = document.getElementById('progressFill');
  if (fill) fill.style.width = `${(currentStep / totalSteps) * 100}%`;

  const label = document.getElementById('stepLabel');
  if (label) label.textContent = `Step ${currentStep} of ${totalSteps}`;

  updateNavButtons();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateNavButtons() {
  const backBtn = document.getElementById('backBtn');
  const nextBtn = document.getElementById('nextBtn');

  if (backBtn) backBtn.style.display = currentStep === 1 ? 'none' : 'inline-flex';

  if (nextBtn) {
    nextBtn.textContent = currentStep === totalSteps ? 'See My Results →' : 'Next →';
  }
}

// ===== CARBON CALCULATION =====

function calculateFootprint() {
  const scores = { food: 0, transport: 0, home: 0 };

  // --- FOOD SCORE ---
  let foodScore = EMISSION_FACTORS.diet[formData.dietType] || 2.5;

  // Local food reduces emissions slightly
  const localFoodReduction = (formData.localFood / 100) * 0.3;
  foodScore *= (1 - localFoodReduction);

  // Food waste adds ~5-20% depending on level
  const wasteAdder = { low: 0, medium: 0.08, high: 0.18 };
  foodScore *= (1 + (wasteAdder[formData.foodWaste] || 0));

  scores.food = Math.round(foodScore * 10) / 10;

  // --- TRANSPORT SCORE ---
  let transportScore = EMISSION_FACTORS.transport[formData.primaryTransport] || 2.0;

  // Car distance modifier (baseline is ~200km/week)
  if (formData.primaryTransport.includes('car')) {
    const distanceFactor = formData.carDistance / 200;
    transportScore *= distanceFactor;
  }

  // Flights
  if (formData.flightType !== 'none') {
    const flightEmissions = EMISSION_FACTORS.flights[formData.flightType] * formData.flights;
    transportScore += flightEmissions;
  }

  scores.transport = Math.round(transportScore * 10) / 10;

  // --- HOME SCORE ---
  let homeScore = EMISSION_FACTORS.home[formData.homeType] || 2.0;
  homeScore += EMISSION_FACTORS.heating[formData.heatingType] || 0;

  // Electricity bill factor (baseline $100/month)
  const electricFactor = formData.electricBill / 100;
  homeScore *= (0.5 + 0.5 * electricFactor);

  // Green home reductions
  if (formData.greenHome.includes('solar')) homeScore *= 0.75;
  if (formData.greenHome.includes('heatpump')) homeScore *= 0.85;
  if (formData.greenHome.includes('insulation')) homeScore *= 0.90;

  scores.home = Math.round(homeScore * 10) / 10;

  // Total
  const total = Math.round((scores.food + scores.transport + scores.home) * 10) / 10;

  // Grade
  let grade, gradeColor;
  if (total < 3) { grade = 'Excellent'; gradeColor = '#4ade80'; }
  else if (total < 5) { grade = 'Good'; gradeColor = '#86efac'; }
  else if (total < 8) { grade = 'Average'; gradeColor = '#fbbf24'; }
  else if (total < 12) { grade = 'High'; gradeColor = '#fb923c'; }
  else { grade = 'Very High'; gradeColor = '#f87171'; }

  const countryAvg = COUNTRY_AVERAGES[formData.country] || 8;
  const vsAverage = total < countryAvg
    ? `${Math.round(((countryAvg - total) / countryAvg) * 100)}% below average`
    : `${Math.round(((total - countryAvg) / countryAvg) * 100)}% above average`;

  return {
    total,
    scores,
    grade,
    gradeColor,
    vsAverage,
    countryAvg,
    formData: { ...formData }
  };
}

// ===== SUBMIT =====

function submitForm() {
  const result = calculateFootprint();
  // Store in sessionStorage for results page
  sessionStorage.setItem('greenprint_result', JSON.stringify(result));
  sessionStorage.setItem('gp_from_calc', '1');
  window.location.href = 'results.html';
}

/* ===== QUICK MODE ===== */
const ARCHETYPE_DATA = {
  student: {
    country: 'CA', householdSize: 3, location: '',
    dietType: 'omnivore_low', localFood: 30, foodWaste: 'medium',
    primaryTransport: 'public_transit', carDistance: 0, flights: 1, flightType: 'short',
    homeType: 'apartment_small', heatingType: 'natural_gas', electricBill: 60, greenHome: []
  },
  urban_professional: {
    country: 'CA', householdSize: 1, location: '',
    dietType: 'omnivore_high', localFood: 20, foodWaste: 'medium',
    primaryTransport: 'gas_car_small', carDistance: 150, flights: 3, flightType: 'short',
    homeType: 'apartment_large', heatingType: 'natural_gas', electricBill: 100, greenHome: []
  },
  suburban_family: {
    country: 'CA', householdSize: 4, location: '',
    dietType: 'omnivore_high', localFood: 20, foodWaste: 'medium',
    primaryTransport: 'gas_car_large', carDistance: 300, flights: 4, flightType: 'short',
    homeType: 'house_large', heatingType: 'natural_gas', electricBill: 200, greenHome: []
  },
  eco_conscious: {
    country: 'CA', householdSize: 2, location: '',
    dietType: 'vegetarian', localFood: 70, foodWaste: 'low',
    primaryTransport: 'electric_car', carDistance: 150, flights: 1, flightType: 'short',
    homeType: 'apartment_large', heatingType: 'electric_renewable', electricBill: 80, greenHome: ['solar', 'heatpump']
  },
  high_footprint: {
    country: 'CA', householdSize: 2, location: '',
    dietType: 'beef_heavy', localFood: 10, foodWaste: 'high',
    primaryTransport: 'gas_car_large', carDistance: 500, flights: 10, flightType: 'long',
    homeType: 'house_large', heatingType: 'oil', electricBill: 300, greenHome: []
  },
  rural: {
    country: 'CA', householdSize: 3, location: '',
    dietType: 'omnivore_low', localFood: 50, foodWaste: 'low',
    primaryTransport: 'gas_car_small', carDistance: 250, flights: 1, flightType: 'short',
    homeType: 'house_small', heatingType: 'natural_gas', electricBill: 130, greenHome: ['insulation']
  }
};

let selectedArchetype = null;

function openQuickMode() {
  document.getElementById('quickModeModal').style.display = 'flex';

  document.querySelectorAll('.archetype-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.archetype-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedArchetype = card.dataset.archetype;
    });
  });
}

function closeQuickMode() {
  document.getElementById('quickModeModal').style.display = 'none';
}

function submitQuickMode() {
  if (!selectedArchetype) {
    alert('Please pick a lifestyle first.');
    return;
  }

  const archetypeFormData = { ...ARCHETYPE_DATA[selectedArchetype] };
  const locationInput = document.getElementById('quickLocation');
  if (locationInput && locationInput.value.trim()) {
    archetypeFormData.location = locationInput.value.trim();
  }

  // Temporarily override formData and calculate
  Object.assign(formData, archetypeFormData);
  const result = calculateFootprint();
  result.isQuickMode = true;
  result.archetype = selectedArchetype;

  sessionStorage.setItem('greenprint_result', JSON.stringify(result));
  sessionStorage.setItem('gp_from_calc', '1');
  window.location.href = 'results.html';
}