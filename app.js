/* Heat & Housing — #30DayMapChallenge 2026 hub. Reads data/days.json; a day is live when status === "live". */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const BC = { 1: "#c2552d", 2: "#2f6fb0", 3: "#9b3f86", 4: "#1f8a7a" };
  const CITY = { Berlin: [13.405, 52.52], Hamburg: [9.993, 53.551], Munich: [11.576, 48.137], Cologne: [6.96, 50.938], Frankfurt: [8.682, 50.11],
                 Stuttgart: [9.18, 48.776], "Düsseldorf": [6.773, 51.228], Leipzig: [12.374, 51.34] };
  const st = { status: "all", city: "all" };
  let D, map;

  fetch("data/days.json", { cache: "no-cache" }).then((r) => r.json()).then((d) => { D = d; render(); initMap(); });

  const fmtDate = (s) => new Date(s + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const live = () => D.days.filter((d) => d.status === "live");

  function render() {
    const n = live().length;
    $("#progress").innerHTML = `<div class="bar"><i style="width:${100 * n / 30}%"></i></div>
      <div class="pl"><b>${n} of 30</b> maps live <span>· ${new Set(live().map((d) => d.city)).size} cities so far · updated ${fmtDate(D.updated)}</span></div>`;

    const last = live().slice(-1)[0];
    if (last) {
      $("#latest").innerHTML = `<a class="latestcard" href="${last.url}">
        <img src="${last.thumb}" alt="Preview of day ${last.day}" loading="eager">
        <div><p class="eyebrow">Latest · Day ${last.day} · ${esc(last.theme)} · ${esc(last.city)}</p>
          <h2>${esc(last.title)}</h2><p class="q">${esc(last.question)}</p><p class="f">${esc(last.finding)}</p>
          <span class="go">Open the interactive map →</span></div></a>`;
    }

    const cities = ["all", ...Object.keys(CITY).filter((c) => D.days.some((d) => d.city === c)), "8 cities"];
    $("#fStatus").innerHTML = [["all", "All 30 days"], ["live", `Live (${n})`], ["planned", `Coming (${30 - n})`]]
      .map(([k, l]) => `<button data-s="${k}" class="${st.status === k ? "on" : ""}">${l}</button>`).join("");
    $("#fCity").innerHTML = cities.map((c) => `<button data-c="${esc(c)}" class="${st.city === c ? "on" : ""}">${c === "all" ? "All cities" : esc(c)}</button>`).join("");
    document.querySelectorAll("#fStatus button").forEach((b) => b.onclick = () => { st.status = b.dataset.s; render(); });
    document.querySelectorAll("#fCity button").forEach((b) => b.onclick = () => { st.city = b.dataset.c; render(); hl(); });

    const show = (d) => (st.status === "all" || d.status === st.status) && (st.city === "all" || d.city === st.city);
    $("#blocks").innerHTML = Object.entries(D.blocks).map(([b, name]) => {
      const ds = D.days.filter((d) => d.block == b && show(d));
      if (!ds.length) return "";
      const all = D.days.filter((d) => d.block == b);
      return `<section class="block" style="--bc:${BC[b]}">
        <div class="bh"><span class="bn">Week ${b}</span><h2>${esc(name)}</h2><span class="br">Days ${all[0].day}–${all[all.length - 1].day} · ${all.filter((d) => d.status === "live").length} live</span></div>
        <div class="grid">${ds.map(card).join("")}</div></section>`;
    }).join("") || `<p class="empty">No day matches this filter yet.</p>`;
  }

  function card(d) {
    const head = `<p class="meta"><span class="dn">${String(d.day).padStart(2, "0")}</span><span>${esc(d.theme)}</span><span class="city">${esc(d.city)}</span></p>`;
    if (d.status === "live") {
      return `<article class="card live">
        <div class="thumb"><img src="${d.thumb}" alt="Preview of day ${d.day}" loading="lazy"><span class="badge">Live</span></div>
        <div class="body">${head}<h3><a class="stretch" href="${d.url}">${esc(d.title)}</a></h3><p class="f">${esc(d.finding)}</p>
        <p class="links"><span class="go">Open map →</span><a href="${d.repo}" class="code">Code &amp; data</a></p></div></article>`;
    }
    return `<div class="card soon">${head}<h3>${esc(d.title)}</h3><p class="q">${esc(d.question)}</p><p class="when">Coming ${fmtDate(d.date)}</p></div>`;
  }

  function initMap() {
    if (!window.maplibregl) return;
    map = new maplibregl.Map({ container: "map", style: `https://basemaps.cartocdn.com/gl/${matchMedia("(prefers-color-scheme: dark)").matches ? "dark-matter" : "positron"}-nolabels-gl-style/style.json`,
      bounds: [[5.6, 47.3], [15.2, 55.0]], fitBoundsOptions: { padding: 18 }, interactive: false, attributionControl: false });
    let ready = false;
    const setup = () => {
      if (ready || !(map.style && map.style._loaded)) return;
      ready = true;
      const fc = { type: "FeatureCollection", features: Object.entries(CITY).map(([c, ll]) => {
        const all = D.days.filter((d) => d.city === c).length, l = D.days.filter((d) => d.city === c && d.status === "live").length;
        return { type: "Feature", properties: { c, all, l, t: `${c} ${l}/${all}` }, geometry: { type: "Point", coordinates: ll } };
      }) };
      map.addSource("c", { type: "geojson", data: fc });
      map.addLayer({ id: "ca", type: "circle", source: "c", paint: { "circle-radius": ["+", 6, ["*", 3, ["get", "all"]]], "circle-color": matchMedia("(prefers-color-scheme: dark)").matches ? "#3a3732" : "#e9e3d8", "circle-stroke-color": matchMedia("(prefers-color-scheme: dark)").matches ? "#57534b" : "#c9bfb0", "circle-stroke-width": 1 } });
      map.addLayer({ id: "cl", type: "circle", source: "c", filter: [">", ["get", "l"], 0], paint: { "circle-radius": ["+", 3, ["*", 3, ["get", "l"]]], "circle-color": "#c2552d" } });
      map.addLayer({ id: "cs", type: "circle", source: "c", paint: { "circle-radius": ["+", 9, ["*", 3, ["get", "all"]]], "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": matchMedia("(prefers-color-scheme: dark)").matches ? "#efece6" : "#2b2925", "circle-stroke-width": ["case", ["==", ["get", "c"], st.city], 2, 0] } });
      map.addLayer({ id: "ct", type: "symbol", source: "c", layout: { "text-field": ["get", "t"], "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"], "text-size": 12,
        "text-offset": [0, 1.6], "text-anchor": "top", "text-allow-overlap": true }, paint: { "text-color": matchMedia("(prefers-color-scheme: dark)").matches ? "#efece6" : "#2b2925", "text-halo-color": matchMedia("(prefers-color-scheme: dark)").matches ? "#161513" : "#fff", "text-halo-width": 1.6 } });
      const canvas = map.getCanvas();
      canvas.addEventListener("click", (e) => {
        const r = canvas.getBoundingClientRect(), f = map.queryRenderedFeatures([e.clientX - r.left, e.clientY - r.top], { layers: ["ca"] })[0];
        st.city = f ? (st.city === f.properties.c ? "all" : f.properties.c) : "all"; render(); hl();
        if (f) document.getElementById("blocks").scrollIntoView({ behavior: "smooth" });
      });
      canvas.addEventListener("mousemove", (e) => {
        const r = canvas.getBoundingClientRect(); canvas.style.cursor = map.queryRenderedFeatures([e.clientX - r.left, e.clientY - r.top], { layers: ["ca"] }).length ? "pointer" : "";
      });
    };
    map.on("load", setup);
    map.on("styledata", () => setTimeout(setup, 0));
    const poll = setInterval(() => { setup(); if (ready) clearInterval(poll); }, 300);
  }
  function hl() { if (map && map.getLayer("cs")) map.setPaintProperty("cs", "circle-stroke-width", ["case", ["==", ["get", "c"], st.city], 2, 0]); }
})();
