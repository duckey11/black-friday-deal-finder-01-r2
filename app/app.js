// Deal Radar app logic: renders the deal grid, filters, sorting and totals.
// All deal numbers are computed from deals.js, never typed twice.

import { DEALS, VERDICT_LABELS, CATEGORIES, RETAILERS, COMPARISONS, CHECKED_DATE } from "./deals.js";

const money = (n) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money0 = (n) => "$" + Math.round(n).toLocaleString("en-US");

const pctOff = (d) => Math.round(((d.list - d.sale) / d.list) * 100);
const saved = (d) => d.list - d.sale;

const state = { q: "", cat: "All", retailer: "All", minPct: 0, sort: "pct" };

const grid = document.getElementById("deal-grid");
const countEl = document.getElementById("result-count");
const searchInput = document.getElementById("search");
const retailerSelect = document.getElementById("retailer-filter");
const pctSelect = document.getElementById("min-discount");
const sortSelect = document.getElementById("sort");
const catBar = document.getElementById("category-bar");

function verdictClass(v) {
  return { "new-low": "v-newlow", strong: "v-strong", solid: "v-solid", modest: "v-modest" }[v] || "v-solid";
}

function dealCard(d) {
  const pct = pctOff(d);
  const el = document.createElement("article");
  el.className = "card";
  el.dataset.id = d.id;
  const also = (d.alsoAt || [])
    .map((a) => `<li><span>${a.retailer}</span> <strong>${money(a.price)}</strong> <em>${a.note}</em></li>`)
    .join("");
  el.innerHTML = `
    <div class="card-top">
      <span class="cat">${d.category}</span>
      <span class="verdict ${verdictClass(d.verdict)}">${VERDICT_LABELS[d.verdict]}</span>
    </div>
    <h3>${d.name}</h3>
    <p class="retailer">${d.retailer}</p>
    <div class="prices">
      <span class="sale">${money(d.sale)}</span>
      <span class="list"><s>${money(d.list)}</s></span>
      <span class="pct">-${pct}%</span>
    </div>
    <p class="save">You save <strong>${money(saved(d))}</strong></p>
    <p class="note">${d.verdictNote}</p>
    ${also ? `<details class="also"><summary>Also at other stores</summary><ul>${also}</ul></details>` : ""}
    <div class="card-foot">
      <a class="store-link" href="${d.storeUrl}" target="_blank" rel="noopener">View at ${d.retailer} &rarr;</a>
      <span class="checked">Checked ${CHECKED_DATE}</span>
    </div>
    <p class="source">Source: <a href="${d.sourceUrl}" target="_blank" rel="noopener">${d.source}</a></p>
  `;
  return el;
}

function applyFilters() {
  const q = state.q.trim().toLowerCase();
  let list = DEALS.filter((d) => {
    if (state.cat !== "All" && d.category !== state.cat) return false;
    if (state.retailer !== "All" && d.retailer !== state.retailer) return false;
    if (pctOff(d) < state.minPct) return false;
    if (q && !(d.name + " " + d.retailer + " " + d.category).toLowerCase().includes(q)) return false;
    return true;
  });
  const sorts = {
    pct: (a, b) => pctOff(b) - pctOff(a) || saved(b) - saved(a),
    saved: (a, b) => saved(b) - saved(a) || pctOff(b) - pctOff(a),
    price: (a, b) => a.sale - b.sale,
    name: (a, b) => a.name.localeCompare(b.name),
  };
  list = [...list].sort(sorts[state.sort] || sorts.pct);
  return list;
}

function render() {
  const list = applyFilters();
  grid.innerHTML = "";
  if (!list.length) {
    grid.innerHTML = `<p class="empty">No deals match those filters. Try clearing the search or lowering the minimum discount.</p>`;
  } else {
    list.forEach((d) => grid.appendChild(dealCard(d)));
  }
  countEl.textContent = `Showing ${list.length} of ${DEALS.length} deals`;
  document.querySelectorAll("#category-bar button").forEach((b) => {
    b.classList.toggle("active", b.dataset.cat === state.cat);
    b.setAttribute("aria-pressed", b.dataset.cat === state.cat ? "true" : "false");
  });
}

function renderTotals() {
  const totalSaved = DEALS.reduce((s, d) => s + saved(d), 0);
  const biggestPct = Math.max(...DEALS.map(pctOff));
  const biggestSave = Math.max(...DEALS.map(saved));
  const avgPct = Math.round(DEALS.reduce((s, d) => s + pctOff(d), 0) / DEALS.length);
  const newLows = DEALS.filter((d) => d.verdict === "new-low").length;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("stat-deals", String(DEALS.length));
  set("stat-saved", money0(totalSaved));
  set("stat-biggest-pct", biggestPct + "%");
  set("stat-avg-pct", avgPct + "%");
  set("stat-newlows", String(newLows));
  set("stat-biggest-save", money0(biggestSave));
  set("summary-line",
    `Buy all ${DEALS.length} deals and you save ${money(totalSaved)} in total. ` +
    `The deepest cut is ${biggestPct}% off, the biggest single saving is ${money(biggestSave)}, ` +
    `and ${newLows} of these prices are the lowest ever tracked for their product.`);
}

function renderSpotlight() {
  const top = [...DEALS].sort((a, b) => saved(b) - saved(a)).slice(0, 3);
  const wrap = document.getElementById("spotlight-list");
  wrap.innerHTML = "";
  top.forEach((d, i) => {
    const el = document.createElement("div");
    el.className = "spot";
    el.innerHTML = `
      <span class="spot-rank">#${i + 1} biggest saving</span>
      <strong>${d.name}</strong>
      <span>${d.retailer} &middot; <s>${money(d.list)}</s> &rarr; <b>${money(d.sale)}</b></span>
      <span class="spot-save">Save ${money(saved(d))} (${pctOff(d)}% off)</span>`;
    wrap.appendChild(el);
  });
}

function renderComparisons() {
  const wrap = document.getElementById("compare-list");
  wrap.innerHTML = "";
  COMPARISONS.forEach((c) => {
    const el = document.createElement("div");
    el.className = "compare";
    const rows = c.prices
      .map((p) => `<tr class="${p.best ? "best-row" : ""}"><td>${p.retailer}${p.best ? " ★ best" : ""}</td><td>${money(p.price)}</td></tr>`)
      .join("");
    el.innerHTML = `
      <h3>${c.product}</h3>
      <table><thead><tr><th>Store</th><th>Price</th></tr></thead><tbody>${rows}</tbody></table>
      <p>${c.note}</p>`;
    wrap.appendChild(el);
  });
}

function renderCategories() {
  const counts = {};
  DEALS.forEach((d) => { counts[d.category] = (counts[d.category] || 0) + 1; });
  catBar.innerHTML = "";
  ["All", ...CATEGORIES].forEach((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.cat = c;
    b.textContent = c === "All" ? `All (${DEALS.length})` : `${c} (${counts[c] || 0})`;
    b.addEventListener("click", () => { state.cat = c; render(); });
    catBar.appendChild(b);
  });
}

function renderRetailers() {
  retailerSelect.innerHTML = `<option value="All">All stores (${DEALS.length})</option>` +
    RETAILERS.map((r) => {
      const n = DEALS.filter((d) => d.retailer === r).length;
      return n ? `<option value="${r}">${r} (${n})</option>` : "";
    }).join("");
}

function readUrlParams() {
  const p = new URLSearchParams(location.search);
  if (p.get("q")) { state.q = p.get("q"); searchInput.value = state.q; }
  if (p.get("cat") && (p.get("cat") === "All" || CATEGORIES.includes(p.get("cat")))) state.cat = p.get("cat");
  if (p.get("store") && RETAILERS.includes(p.get("store"))) { state.retailer = p.get("store"); retailerSelect.value = state.retailer; }
  if (p.get("min")) { state.minPct = Number(p.get("min")) || 0; pctSelect.value = String(state.minPct); }
  if (p.get("sort") && ["pct", "saved", "price", "name"].includes(p.get("sort"))) { state.sort = p.get("sort"); sortSelect.value = state.sort; }
}

searchInput.addEventListener("input", () => { state.q = searchInput.value; render(); });
retailerSelect.addEventListener("change", () => { state.retailer = retailerSelect.value; render(); });
pctSelect.addEventListener("change", () => { state.minPct = Number(pctSelect.value); render(); });
sortSelect.addEventListener("change", () => { state.sort = sortSelect.value; render(); });

renderCategories();
renderRetailers();
readUrlParams();
renderTotals();
renderSpotlight();
renderComparisons();
render();
