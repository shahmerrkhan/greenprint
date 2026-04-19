/* =============================================
   GREENPRINT — AI ACTION PLAN (Gemini 2.0 Flash)
   
   HOW TO GET YOUR FREE API KEY:
   1. Go to aistudio.google.com
   2. Sign in with Google
   3. Click "Get API key" → "Create API key"
   4. Paste it below — no credit card needed
   ============================================= */

const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";

document.addEventListener('DOMContentLoaded', () => {
  const raw = sessionStorage.getItem('greenprint_result');
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    generateAIPlan(data);
  } catch (e) {
    showPlanFallback();
  }
});

async function generateAIPlan(data) {
  const loadingEl = document.getElementById('aiLoading');
  const contentEl = document.getElementById('aiPlanContent');
  if (!loadingEl || !contentEl) return;

  if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
    showPlanFallback(data);
    return;
  }

  const { total, scores, grade, formData } = data;
  const prompt = buildPrompt(total, scores, grade, formData);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 900 }
      })
    });

    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) throw new Error('Empty response');

    loadingEl.style.display = 'none';
    contentEl.style.display = 'block';
    contentEl.innerHTML = parseMarkdownToHTML(text);

  } catch (err) {
    console.warn('Gemini failed:', err);
    showPlanFallback(data);
  }
}

function buildPrompt(total, scores, grade, formData) {
  const dietLabels = {
    vegan: 'vegan', vegetarian: 'vegetarian', pescatarian: 'pescatarian',
    omnivore_low: 'omnivore (low meat)', omnivore_high: 'omnivore (regular meat)', beef_heavy: 'omnivore (beef-heavy)'
  };
  const transportLabels = {
    walk_cycle: 'walking or cycling', public_transit: 'public transit',
    electric_car: 'electric vehicle', gas_car_small: 'gas car (small)', gas_car_large: 'gas SUV or truck'
  };
  const heatingLabels = {
    electric_renewable: 'electric/renewable', natural_gas: 'natural gas', oil: 'oil/propane'
  };

  return `You are a practical, warm climate action advisor. A user just calculated their personal carbon footprint.

USER DATA:
- Total: ${total}t CO2e/year (${grade})
- Food: ${scores.food}t — diet: ${dietLabels[formData.dietType] || formData.dietType}
- Transport: ${scores.transport}t — ${transportLabels[formData.primaryTransport] || formData.primaryTransport}, ${formData.flights} flights/year
- Home: ${scores.home}t — ${heatingLabels[formData.heatingType] || formData.heatingType} heating, ${formData.homeType?.replace(/_/g,' ')}
- Location: ${formData.location || 'Canada'}

Write a personalized plan with these EXACT sections (### headings):

### Your Situation
2 sentences. Honest and direct. Mention their actual diet and transport type. No preaching.

### Top 3 Changes (Highest Impact)
Three bullets ordered by CO2 savings, specific to their actual data, with approximate tonne savings.

### This Month
Two small immediately doable things.

### Use Local Resources
2 sentences connecting local food banks, community fridges, recycling depots, and green orgs to their footprint reduction.

Rules: Under 380 words. Direct, no jargon, no em dashes, no generic filler. Reference their specific situation.`;
}

function parseMarkdownToHTML(text) {
  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*\n?)+/g, match => `<ul>${match}</ul>`)
    .replace(/\n\n(?!<)/g, '</p><p>')
    .replace(/^(?!<)/, '<p>')
    .replace(/(?<!>)$/, '</p>');
}

function showPlanFallback(data) {
  const loadingEl = document.getElementById('aiLoading');
  const contentEl = document.getElementById('aiPlanContent');
  if (!loadingEl || !contentEl) return;

  loadingEl.style.display = 'none';
  contentEl.style.display = 'block';

  if (!data) {
    contentEl.innerHTML = '<p style="color:var(--text-muted)">Unable to load data. Please recalculate.</p>';
    return;
  }

  const { total, scores, formData } = data;
  const topArea = Object.entries(scores).sort((a,b) => b[1]-a[1])[0][0];
  const areaLabels = { food: 'diet', transport: 'transport', home: 'home energy' };
  const pct = Math.round((scores[topArea] / total) * 100);

  contentEl.innerHTML = `
    <h3>Your Situation</h3>
    <p>Your footprint of <strong style="color:var(--green)">${total}t CO₂e/year</strong> is primarily driven by your <strong>${areaLabels[topArea]}</strong> at ${scores[topArea]}t (${pct}% of your total). Here's a practical plan focused on your highest-impact areas.</p>

    <h3>Top 3 Changes (Highest Impact)</h3>
    <ul>${getTopActions(scores, formData)}</ul>

    <h3>This Month</h3>
    <ul>
      <li>Check the Local Resources tab and find the nearest food bank or community fridge — donating surplus food reduces landfill methane emissions at the neighbourhood level.</li>
      <li>Lower your thermostat 2°C before bed tonight, check for drafts around windows, and identify any appliances left on standby — these three things take 10 minutes and cost nothing.</li>
    </ul>

    <h3>Use Local Resources</h3>
    <p>Food banks, community fridges, and recycling depots in your area are direct infrastructure for reducing emissions — they divert food from landfill, keep materials out of waste streams, and build the collective habits that make individual action stick. Use the map to find what's near you.</p>
    <p style="font-size:13px;color:var(--text-faint);margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">
      💡 Add a free Gemini API key to <code>js/ai-plan.js</code> for live AI-generated plans. Get one free at <a href="https://aistudio.google.com" target="_blank" style="color:var(--green)">aistudio.google.com</a>.
    </p>
  `;
}

function getTopActions(scores, formData) {
  const actions = [];
  if (scores.food > 2) {
    if (formData.dietType === 'beef_heavy' || formData.dietType === 'omnivore_high') {
      actions.push('<li><strong>Cut red meat to 2x per week</strong> — beef emits 60x more CO₂ per gram of protein than legumes. This one change saves 0.8–1.5t/year.</li>');
    } else {
      actions.push('<li><strong>Meal plan to cut food waste</strong> — wasted food is ~8% of global emissions. Planning your week saves ~0.4t/year and cuts grocery costs.</li>');
    }
  }
  if (scores.transport > 2) {
    if (formData.primaryTransport.includes('gas_car')) {
      actions.push('<li><strong>Replace 3 short car trips/week with transit or cycling</strong> — a gas car emits ~180–250g CO₂/km. Cutting 40km/week saves ~0.5–0.7t/year.</li>');
    }
    if (formData.flights > 3) {
      actions.push('<li><strong>Skip one return long-haul flight</strong> — a Toronto-London return is ~1.7t CO₂e, equal to 6 months of average home heating.</li>');
    }
  }
  if (scores.home > 2.5) {
    if (formData.heatingType === 'oil') {
      actions.push('<li><strong>Research a heat pump upgrade</strong> — cuts home heating emissions by 60–70%. Federal Canada Greener Homes Grant covers up to $5,000.</li>');
    } else {
      actions.push('<li><strong>Switch to a renewable electricity plan</strong> — available from most Ontario providers at minimal cost, saves 0.3–0.8t/year with one phone call.</li>');
    }
  }
  if (actions.length < 3) {
    actions.push('<li><strong>Buy local and seasonal produce</strong> — locally grown food generates up to 50x fewer transport emissions. Start with one local market visit per week.</li>');
  }
  return actions.slice(0, 3).join('');
}