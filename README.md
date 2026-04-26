# GreenPrint 🌱

**Know your impact. Act locally.**

GreenPrint calculates your personal carbon footprint across food, transport, and home energy — then immediately connects you to real local resources to act on it. Food banks, community fridges, recycling depots, and green initiatives near you, on a live interactive map.

Built for **FutureForge 2025** (Climate Action Track) in one week by a 16-year-old self-taught developer.

---

## The Problem

Most carbon footprint tools stop at the score. You find out you're at 14 tonnes and then nothing happens. No next step. No local resources. Just guilt and a tab you close and never open again.

GreenPrint closes that loop.

---

## What It Does

- **Carbon Calculator** — multi-step form across food, transport, and home energy using real emission factors from published scientific sources
- **Quick Mode** — pick a lifestyle archetype and get your score in 30 seconds, no form required
- **Live Map** — food banks, community fridges, recycling depots, and green orgs near you via OpenStreetMap and the Overpass API
- **AI Action Plan** — personalized plan powered by Gemini 2.0 Flash, specific to your actual diet, transport, and heating data
- **What If Simulator** — change your diet, transport, heating, or flights and watch your projected score update live
- **7-Day Check-In** — commit to one action, return after a week, log whether you did it, see your actual CO₂ saved
- **Badge System** — 8 badges earned through real actions and check-ins
- **Neighbourhood Counter** — shows how many people have used the app and combined savings potential
- **Shareable Results Card** — save or print your footprint summary as a PDF

---

## Tech Stack

- HTML, CSS, JavaScript — no framework, no backend, no database
- [Leaflet.js](https://leafletjs.com/) + [OpenStreetMap](https://www.openstreetmap.org/)
- [Overpass API](https://overpass-api.de/) for live local resource data
- [Gemini 2.0 Flash](https://aistudio.google.com/) for AI-generated action plans

Runs entirely in the browser. No server needed.

---

## Data Sources

| Category | Source |
|---|---|
| Food emissions | Poore & Nemecek, 2018 — Oxford University |
| Transport & heating | ECCC National Inventory Report |
| Aviation | UK DESNZ 2023 conversion factors |
| Country averages | Our World in Data / Global Carbon Project |
| Local resources | OpenStreetMap via Overpass API |

---

## How to Run It

1. Clone the repo
```bash
git clone https://github.com/shahmerrkhan/greenprint.git
```

2. Open the folder in VS Code

3. Install the Live Server extension

4. Right-click `index.html` and click Open with Live Server

5. Optional — add a free Gemini API key at line 9 of `js/ai-plan.js` for live AI plans. Get one free at [aistudio.google.com](https://aistudio.google.com) — no credit card needed

---

## Built By

Shahmeer — Grade 11, St. Benedict CSS, Cambridge ON.
Self-taught in Python, JavaScript, HTML, CSS, SQL.
FutureForge 2025 · Climate Action Track
