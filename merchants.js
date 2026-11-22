/* ============================================================
   Coverage — merchants layer
   Businesses that take Bitcoin or stablecoins, drawn on the same
   globe as the neobank data. Live rows come from BTC Map; a small
   curated stablecoin list and this browser's own submissions sit
   on top. Loaded only when the layer is first opened.
   ============================================================ */

const M_API = "https://api.btcmap.org/v4/places?limit=60000&fields=id,lat,lon,name,address,icon,verified_at,osm:payment:onchain,osm:payment:lightning";
const M_ATLAS = "https://unpkg.com/world-atlas@2/countries-50m.json";
const M_LEAFLET = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min";
const M_COINS = ["BTC","LN","USDC","USDT","DAI","PYUSD"];
const M_CATS = ["Coffee","Restaurant","Bar","Grocery","Retail","Electronics","Hotel","Pharmacy","Services","Other"];
const M_CITIES = {
  "Karachi":[24.8607,67.0011], "Lahore":[31.5204,74.3587], "Islamabad":[33.6844,73.0479],
  "Dubai":[25.2048,55.2708], "London":[51.5072,-0.1276], "Lisbon":[38.7223,-9.1393],
  "Prague":[50.0755,14.4378], "Ljubljana":[46.0569,14.5058], "Buenos Aires":[-34.6037,-58.3816],
  "San Salvador":[13.6929,-89.2182], "New York":[40.7128,-74.0060], "Bangkok":[13.7563,100.5018]
};
const M_ICON_CAT = {
  local_cafe:"Coffee", cafe:"Coffee", restaurant:"Restaurant", fastfood:"Restaurant", local_bar:"Bar",
  sports_bar:"Bar", hotel:"Hotel", local_atm:"Bitcoin ATM", atm:"Bitcoin ATM", store:"Retail",
  shopping_cart:"Grocery", local_grocery_store:"Grocery", computer:"Electronics", devices:"Electronics",
  local_pharmacy:"Pharmacy", medical_services:"Pharmacy", spa:"Wellness", fitness_center:"Wellness",
  car_repair:"Services", build:"Services", group:"Services", checkroom:"Clothing", storefront:"Retail"
};
const M_STABLE = [
  {n:"Kaffee Beans",      cat:"Coffee",     a:"Zamzama Blvd, DHA Phase 5, Karachi",  ll:[24.8145,67.0324], coins:["USDC","USDT"]},
  {n:"Chai Wala Co.",     cat:"Coffee",     a:"Boat Basin, Clifton, Karachi",        ll:[24.8215,67.0316], coins:["LN","BTC"]},
  {n:"Kolachi Grill",     cat:"Restaurant", a:"Do Darya, DHA Phase 8, Karachi",      ll:[24.7815,67.0553], coins:["USDT","USDC","BTC"]},
  {n:"TechHub Karachi",   cat:"Electronics",a:"Saddar Electronics Market, Karachi",  ll:[24.8607,67.0225], coins:["USDT","BTC","USDC"]},
  {n:"Cafe Aylanto",      cat:"Restaurant", a:"MM Alam Road, Gulberg, Lahore",       ll:[31.5145,74.3489], coins:["USDC","USDT"]},
  {n:"Gloria Coffee",     cat:"Coffee",     a:"DHA Phase 4, Y Block, Lahore",        ll:[31.4732,74.4103], coins:["LN","USDC"]},
  {n:"Burning Brownie",   cat:"Coffee",     a:"F-7 Markaz, Islamabad",               ll:[33.7180,73.0551], coins:["USDC","LN"]},
  {n:"Crypto Cafe DIFC",  cat:"Coffee",     a:"Gate Avenue, DIFC, Dubai",            ll:[25.2110,55.2810], coins:["USDC","BTC","LN","DAI"]},
  {n:"Arabica Roasters",  cat:"Coffee",     a:"JLT Cluster D, Dubai",                ll:[25.0693,55.1416], coins:["USDC","USDT","PYUSD"]},
  {n:"Souk Electronics",  cat:"Electronics",a:"Al Fahidi St, Bur Dubai",             ll:[25.2632,55.2972], coins:["USDT","BTC"]},
  {n:"Cafe Tortoni",      cat:"Coffee",     a:"Av. de Mayo 825, Buenos Aires",       ll:[-34.6086,-58.3777],coins:["USDT","USDC"]},
  {n:"Recoleta Farmacia", cat:"Pharmacy",   a:"Av. Santa Fe 1800, Buenos Aires",     ll:[-34.5950,-58.3920],coins:["USDT"]}
].map((p,i)=>Object.assign({id:"c"+i, src:"curated"}, p));

/* ---------------- rows ---------------- */
const mPretty = s => (s||"other").replace(/_/g," ").replace(/\b\w/g,m=>m.toUpperCase());
const mValid = x => !!x && typeof x.lat==="number" && typeof x.lon==="number" && !!x.name;
/* on-chain and Lightning are tagged separately; a row tagged with neither still takes Bitcoin somehow */
function mNormalize(r){
  const chain = r["osm:payment:onchain"]==="yes", ln = r["osm:payment:lightning"]==="yes";
  return { id:"b"+r.id, n:r.name || "Unnamed merchant", ll:[r.lat, r.lon], a:r.address || "",
    cat:M_ICON_CAT[r.icon] || mPretty(r.icon), coins:ln ? (chain ? ["BTC","LN"] : ["LN"]) : ["BTC"],
    v:r.verified_at || null, src:"btcmap" };
}
/* the cache keeps tuples: the keyed rows are too big for localStorage */
const M_CACHE_V = 2;
const mPack = r => [r.id, r.lat, r.lon, r.name, r.address||"", r.icon||"", r.verified_at||"",
  (r["osm:payment:onchain"]==="yes"?1:0) + (r["osm:payment:lightning"]==="yes"?2:0)];
const mUnpack = t => ({id:t[0], lat:t[1], lon:t[2], name:t[3], address:t[4], icon:t[5]||undefined, verified_at:t[6]||null,
  "osm:payment:onchain":t[7]&1?"yes":undefined, "osm:payment:lightning":t[7]&2?"yes":undefined});

/* BTC Map rows nobody has re-verified in a year are flagged, not hidden */
function mStale(p, now){
  if(p.src!=="btcmap") return false;
  if(!p.v) return true;
  return ((now==null?Date.now():now) - new Date(p.v).getTime()) > 3.15e10;
}
function mMatches(p, q, coins){
  if(q){
    const s = (p.n+" "+p.cat+" "+p.a).toLowerCase();
    if(!q.split(/\s+/).every(t=>s.includes(t))) return false;
  }
  if(coins && coins.size && !p.coins.some(c=>coins.has(c))) return false;
  return true;
}
/* an even sample, so a capped globe still shows every region */
function mSample(a, cap){
  if(a.length<=cap) return a;
  const step=a.length/cap, out=[];
  for(let i=0;i<cap;i++) out.push(a[Math.floor(i*step)]);
  return out;
}

/* ---------------- which country is a point in ----------------
   Borders are simplified, so a shop on the waterfront can fall just
   outside its own country. A point within M_COAST degrees of a
   country counts as inside it, unless another country contains it. */
const M_COAST = 0.2;
function mIndex(features, nameOf){
  const by = new Map(), all = [];
  (features||[]).forEach(f=>{
    const name = nameOf(f), g = f && f.geometry;
    if(!name || !g) return;
    const polys = g.type==="Polygon" ? [g.coordinates] : g.type==="MultiPolygon" ? g.coordinates : [];
    polys.forEach(rings=>{
      let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
      (rings[0]||[]).forEach(p=>{ if(p[0]<x0)x0=p[0]; if(p[0]>x1)x1=p[0]; if(p[1]<y0)y0=p[1]; if(p[1]>y1)y1=p[1]; });
      const poly = {name, rings, box:[x0,y0,x1,y1]};
      all.push(poly);
      if(!by.has(name)) by.set(name, []);
      by.get(name).push(poly);
    });
  });
  return {by, all};
}
function mInRing(x, y, ring){
  let inside = false;
  for(let i=0, j=ring.length-1; i<ring.length; j=i++){
    const xi=ring[i][0], yi=ring[i][1], xj=ring[j][0], yj=ring[j][1];
    if((yi>y)!==(yj>y) && x < (xj-xi)*(y-yi)/(yj-yi)+xi) inside = !inside;
  }
  return inside;
}
function mInPoly(x, y, poly){
  const b = poly.box;
  if(x<b[0]||x>b[2]||y<b[1]||y>b[3]) return false;
  if(!mInRing(x, y, poly.rings[0])) return false;
  for(let i=1;i<poly.rings.length;i++) if(mInRing(x, y, poly.rings[i])) return false;
  return true;
}
/* shortest distance to the outline, in degrees of latitude */
function mEdgeDist(x, y, poly){
  const k = Math.cos(y*Math.PI/180) || 1e-6, ring = poly.rings[0];
  let best = Infinity;
  for(let i=0, j=ring.length-1; i<ring.length; j=i++){
    const ax=(ring[j][0]-x)*k, ay=ring[j][1]-y, bx=(ring[i][0]-x)*k, by=ring[i][1]-y;
    const dx=bx-ax, dy=by-ay, len=dx*dx+dy*dy;
    const t = len ? Math.max(0, Math.min(1, -(ax*dx+ay*dy)/len)) : 0;
    const d = Math.hypot(ax+t*dx, ay+t*dy);
    if(d<best) best = d;
  }
  return best;
}
/* true / false, or null when the map has no outline for that country */
function mInCountry(lat, lng, name, idx){
  const polys = idx && idx.by.get(name);
  if(!polys) return null;
  let near = false;
  for(const p of polys){
    const b = p.box;
    if(lng<b[0]-M_COAST||lng>b[2]+M_COAST||lat<b[1]-M_COAST||lat>b[3]+M_COAST) continue;
    if(mInPoly(lng, lat, p)) return true;
    if(!near && mEdgeDist(lng, lat, p) <= M_COAST) near = true;
  }
  if(!near) return false;
  for(const p of idx.all) if(p.name!==name && mInPoly(lng, lat, p)) return false;
  return true;
}

/* ---------------- the layer itself ----------------
   Leans on the page's own state: globe, feats, country, layer,
   canonFeature, LS, esc, toast, setCountry. */
const MC = (()=>{
  const LIST_CAP=120, MAP_CAP=3000, GLOBE_CAP=9000;
  const $ = id => document.getElementById(id);
  let remote=[], all=[], shown=[], coins=new Set(), formCoins=new Set(), selected=null;
  let mode="globe", started=false, src="Source: BTC Map";
  let map=null, dots=null, markers=[], leaf=null, pin=null, pinLL=null;
  let geo=null, geoFine=false, geoWait=null, sets=new Map(), lastCountry=null, gTimer=null;
  let merged=false, loading=true, wantFit=false;

  /* this browser's registrations are held here as well, so one still shows if storage refuses the write */
  let mine = null;
  const rebuild = () => {
    if(!mine) mine = LS.get("cov_merchants", []);
    all = M_STABLE.concat(mine.map(p=>Object.assign({},p,{pending:true}))).concat(remote);
    sets.clear();
  };

  async function load(){
    const c = LS.get("cov_btcmap", null);
    if(c && c.v===M_CACHE_V && Array.isArray(c.d) && Date.now()-c.t < 864e5){
      remote = c.d.map(mUnpack).filter(mValid).map(mNormalize);
      src = "Source: BTC Map · cached"; loading = false; rebuild(); render(); return;
    }
    try{
      const r = await fetch(M_API);
      if(!r.ok) throw new Error(r.status);
      const raw = (await r.json()).filter(mValid);
      LS.set("cov_btcmap", {t:Date.now(), v:M_CACHE_V, d:raw.map(mPack)});
      remote = raw.map(mNormalize); src = "Source: BTC Map · live";
    }catch(e){ src = "Source: offline seed"; }
    loading = false; rebuild(); render();
  }

  /* ---- country membership ---- */
  function finer(){
    if(geoWait) return geoWait;
    geoWait = fetch(M_ATLAS).then(r=>{ if(!r.ok) throw 0; return r.json(); }).then(t=>{
      geo = mIndex(topojson.feature(t, t.objects.countries).features, canonFeature);
      geoFine = true;
    }).catch(()=>{ geoFine = "failed"; }).then(()=>{ sets.clear(); if(layer==="m") render(); });
    return geoWait;
  }
  /* Set of ids in the chosen country; "wait" while borders load; null if it has no outline */
  function countrySet(){
    if(!geoFine){ finer(); return "wait"; }
    if(geoFine==="failed"){
      if(!feats.length) return null;
      if(!geo) geo = mIndex(feats, canonFeature);
    }
    if(sets.has(country)) return sets.get(country);
    let s = null;
    if(geo.by.has(country)){
      s = new Set();
      all.forEach(p=>{ if(mInCountry(p.ll[0], p.ll[1], country, geo)) s.add(p.id); });
    }
    sets.set(country, s);
    return s;
  }

  /* ---- street map ---- */
  function leaflet(){
    if(leaf) return leaf;
    leaf = new Promise((ok, no)=>{
      const css = document.createElement("link"); css.rel="stylesheet"; css.href=M_LEAFLET+".css";
      document.head.appendChild(css);
      const js = document.createElement("script"); js.src=M_LEAFLET+".js";
      js.onload = ()=>ok(); js.onerror = ()=>{ leaf=null; no(new Error("leaflet")); };
      document.head.appendChild(js);
    }).then(()=>{
      const v = globe ? globe.pointOfView() : {lat:22, lng:30, altitude:2.4};
      map = L.map("map", {zoomControl:false, preferCanvas:true})
        .setView([v.lat, v.lng], v.altitude>2 ? 3 : v.altitude>1.2 ? 4 : 5);
      L.control.zoom({position:"bottomright"}).addTo(map);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom:19}).addTo(map);
      dots = L.layerGroup().addTo(map);
      map.on("click", e=>{
        if(!$("m-reg").classList.contains("on")) return;
        pinLL = [e.latlng.lat, e.latlng.lng];
        if(pin) map.removeLayer(pin);
        pin = L.circleMarker(e.latlng, dotStyle(true, true)).addTo(map);
        $("m-pinhint").innerHTML = "Pin set — <b>"+pinLL[0].toFixed(4)+", "+pinLL[1].toFixed(4)+"</b>. Click the map again to move it.";
      });
      map.on("moveend", ()=>{ if(layer==="m" && mode==="map") render(); });
    });
    return leaf;
  }
  const dotStyle = (on, hollow) => ({radius:on?7:4, weight:hollow?2:on?2:0, color:"#0a0a0a",
    fillColor:hollow?"#f7f7f5":"#0a0a0a", fillOpacity:1});
  function fit(list){
    let a=90,b=180,c=-90,d=-180;
    list.forEach(p=>{ if(p.ll[0]<a)a=p.ll[0]; if(p.ll[0]>c)c=p.ll[0]; if(p.ll[1]<b)b=p.ll[1]; if(p.ll[1]>d)d=p.ll[1]; });
    map.fitBounds(L.latLngBounds([a,b],[c,d]).pad(.15), {maxZoom:14, animate:false});
  }

  async function setMode(m){
    if(m==="map"){
      try{ await leaflet(); }
      catch(e){ toast("The street map could not load"); m = "globe"; }
    }
    if(m==="globe" && !globe && map) m = "map";
    mode = m;
    syncView(); render(mode==="map" && !!country);
  }
  function syncView(){
    const on = layer==="m", street = on && mode==="map" && !!map;
    $("map").classList.toggle("on", street);
    $("globe").classList.toggle("off", street);
    if(globe){ if(street) globe.pauseAnimation(); else globe.resumeAnimation(); }
    document.body.classList.toggle("mm", street);
    $("v-globe").classList.toggle("on", !street);
    $("v-map").classList.toggle("on", street);
    $("v-globe").hidden = !globe;
    if(street) setTimeout(()=>map.invalidateSize(), 60);
  }

  /* ---- drawing ---- */
  /* Merchants are drawn as one merged mesh, the city-state markers as
     separate clickable points. The globe only swaps cleanly between the
     two if the points are emptied first, one tick ahead of the switch. */
  function paintGlobe(){
    if(!globe) return;
    if(!merged) globe.pointsData([]);
    clearTimeout(gTimer);
    gTimer = setTimeout(()=>{
      if(layer!=="m") return;
      merged = true;
      globe.pointsMerge(true).pointRadius(.17).pointAltitude(.012).pointColor(()=>"#0a0a0a")
        .pointsData(mSample(shown, GLOBE_CAP).map(p=>({lat:p.ll[0], lng:p.ll[1]})));
    }, 180);
  }
  /* true while the merged dots are still being taken down; calls `then` once they are gone */
  function clearGlobe(then){
    clearTimeout(gTimer);
    if(!merged || !globe) return false;
    globe.pointsData([]);
    gTimer = setTimeout(()=>{
      if(layer==="m") return;
      merged = false;
      globe.pointsMerge(false).pointRadius(.55);
      cityPts = CITY_STATES.map(c=>Object.assign({}, c));
      then();
    }, 80);
    return true;
  }

  function render(fly){
    if(!started || layer!=="m") return;
    const q = $("m-q").value.trim().toLowerCase();
    /* a move asked for while merchants or borders are still loading is kept until they arrive */
    if(country!==lastCountry){ lastCountry = country; wantFit = !!country; }
    if(fly) wantFit = true;
    const set = country ? countrySet() : true;
    const street = mode==="map" && !!map;
    /* a country the map has no outline for can't be filtered: the street map then lists whatever is in view */
    const open = set===true || (set===null && street);
    let res = (open || set instanceof Set)
      ? all.filter(p=>mMatches(p, q, coins) && (open || set.has(p.id))) : [];
    shown = set===null ? [] : res; paintGlobe();

    const ready = !loading && set!=="wait";
    if(!street){ if(ready) wantFit = false; }
    else{
      if(wantFit && ready){
        wantFit = false;
        const spot = set===null && CITY_STATES.find(c=>c.name===country);
        if(spot) map.setView([spot.lat, spot.lng], 12, {animate:false});
        else if(res.length && set!==null && (q || coins.size || country)) fit(res);
      }
      const b = map.getBounds();
      res = res.filter(p=>b.contains(p.ll));
    }

    const where = street ? " in view" : country ? " in "+country : " worldwide";
    $("m-count").textContent = loading ? "Loading merchants…"
      : set==="wait" ? "Finding merchants in "+country+"…"
      : res.length.toLocaleString()+(res.length===1?" merchant":" merchants")+where;
    $("m-src").textContent = src;
    $("s-scope").textContent = country ? country.toUpperCase() : street ? "MAP VIEW" : "WORLDWIDE";
    $("s-count").textContent = (loading || set==="wait") ? "" : res.length.toLocaleString()+(res.length===1?" MERCHANT":" MERCHANTS");

    const box = $("m-rows");
    if(!res.length){
      box.innerHTML = '<div class="empty">'+(
        loading ? "Loading merchants from BTC Map…"
        : set==="wait" ? "Working out which merchants are in <b>"+esc(country)+"</b>…"
        : set===null ? "This map has no outline for <b>"+esc(country)+"</b>, so it can't tell which merchants are there. Open the street map and zoom in instead."
        : street ? "No merchants in this part of the map"+(country?" for <b>"+esc(country)+"</b>":"")+". Zoom out, or go back to the globe."
        : "No merchants match"+(country?" in <b>"+esc(country)+"</b>":"")+". Widen the search, or clear the filters.")+
        (loading || set==="wait" ? "" : '<br><br>Take crypto at your own business? <button class="solid" data-reg>Register your business</button>')+'</div>';
      const r = box.querySelector("[data-reg]"); if(r) r.onclick = openReg;
    }else{
      box.innerHTML = res.slice(0, LIST_CAP).map(p=>
        '<div class="row'+(selected===p.id?" sel":"")+'" data-m="'+esc(p.id)+'"><div class="rt"><h3>'+esc(p.n)+'</h3>'+
        '<span class="mtags">'+(p.pending?'<span class="t rev">Pending</span>':'')+
        (mStale(p)?'<span class="t rev">Unverified</span>':'')+
        p.coins.map(c=>'<span class="t">'+esc(c)+'</span>').join("")+'</span></div>'+
        '<p class="why">'+esc(p.cat+(p.a?" · "+p.a:""))+'</p></div>').join("")+
        (res.length>LIST_CAP ? '<div class="grp">Showing '+LIST_CAP+' of '+res.length.toLocaleString()+
          ' — narrow the search'+(street?" or zoom in":country?"":" or pick a country")+'</div>' : '');
      [...box.querySelectorAll("[data-m]")].forEach(el=>el.onclick=()=>focusPlace(res.find(p=>p.id===el.dataset.m)));
    }

    if(map){
      dots.clearLayers(); markers = [];
      if(street) res.slice(0, MAP_CAP).forEach(p=>{
        const m = L.circleMarker(p.ll, dotStyle(selected===p.id, p.src!=="btcmap")).addTo(dots);
        m.bindPopup('<div class="pop-t">'+esc(p.n)+'</div><div class="pop-m">'+esc(p.cat)+(p.a?' &middot; '+esc(p.a):'')+'</div>'+
          '<div class="mtags">'+p.coins.map(c=>'<span class="t">'+esc(c)+'</span>').join("")+'</div>');
        markers.push({id:p.id, marker:m});
      });
    }
  }

  async function focusPlace(p){
    if(!p) return;
    selected = p.id;
    if(mode!=="map" || !map) await setMode("map");
    if(!map) return;
    map.setView(p.ll, 16, {animate:false});
    render();
    const m = markers.find(x=>x.id===p.id); if(m) m.marker.openPopup();
  }

  /* ---- register a business ---- */
  function openReg(){ $("m-reg").classList.add("on"); $("m-back").focus(); }
  function closeReg(){
    $("m-reg").classList.remove("on");
    if(pin && map){ map.removeLayer(pin); } pin = null; pinLL = null;
    $("m-pinhint").innerHTML = "Open the <b>street map</b> and click it to drop an exact pin. Otherwise the city centre is used.";
    $("m-err").style.display = "none";
  }
  function submit(){
    const name = $("m-name").value.trim(), err = $("m-err");
    const bad = !name ? "Business name is required" : !formCoins.size ? "Select at least one accepted network" : "";
    if(bad){ err.textContent = bad; err.style.display = "block"; return; }
    const city = $("m-city").value, addr = $("m-addr").value.trim();
    const rec = { id:"u"+Date.now(), n:name, cat:$("m-cat").value, src:"user", a:(addr?addr+", ":"")+city,
      ll:pinLL || M_CITIES[city], coins:[...formCoins], contact:$("m-contact").value.trim(),
      submitted:new Date().toISOString() };
    mine.push(rec);
    const kept = () => { LS.set("cov_merchants", mine); return LS.get("cov_merchants", []).some(p=>p.id===rec.id); };
    let saved = kept();
    if(!saved){ /* storage is full: the merchant cache can be fetched again, a registration can't */
      try{ localStorage.removeItem("cov_btcmap"); }catch(e){}
      saved = kept();
    }
    ["m-name","m-addr","m-contact","m-q"].forEach(id=>$(id).value="");
    formCoins.clear(); coins.clear();
    [...$("m-fcoins").children, ...$("m-chips").children].forEach(b=>b.classList.remove("on"));
    closeReg(); rebuild();
    if(country) setCountry(null);
    toast(saved ? "Submitted — pending review" : "Listed for this visit only — this browser would not save it");
    focusPlace(all.find(p=>p.id===rec.id));
  }

  function chip(box, label, fn){
    const b = document.createElement("button"); b.className="chip"; b.type="button"; b.textContent=label;
    b.onclick = ()=>fn(b); box.appendChild(b);
  }
  function start(){
    started = true;
    M_COINS.forEach(c=>chip($("m-chips"), c, b=>{ coins.has(c)?coins.delete(c):coins.add(c); b.classList.toggle("on"); render(); }));
    Object.keys(M_CITIES).forEach(n=>chip($("m-cities"), n, async ()=>{
      selected = null; if(country) setCountry(null);
      await setMode("map"); if(map){ map.setView(M_CITIES[n], 12, {animate:false}); render(); } }));
    M_COINS.forEach(c=>chip($("m-fcoins"), c, b=>{ formCoins.has(c)?formCoins.delete(c):formCoins.add(c); b.classList.toggle("on"); }));
    M_CATS.forEach(c=>$("m-cat").add(new Option(c, c)));
    Object.keys(M_CITIES).forEach(c=>$("m-city").add(new Option(c, c)));
    $("m-q").addEventListener("input", ()=>render());
    $("m-q").addEventListener("keydown", e=>{ if(e.key==="Enter"){ selected=null; render(true); } });
    $("v-globe").onclick = ()=>setMode("globe");
    $("v-map").onclick = ()=>setMode("map");
    $("m-reg-top").onclick = openReg; $("m-open").onclick = openReg;
    $("m-back").onclick = closeReg; $("m-cancel").onclick = closeReg; $("m-submit").onclick = submit;
    $("m-pin").onclick = ()=>setMode("map");
    rebuild(); load();
    if(!globe) setMode("map");
  }

  return {
    show(){ if(!started) start(); syncView(); },
    hide(){ if(started){ closeReg(); syncView(); } },
    render, paintGlobe, clearGlobe,
    /* Escape closes the form first */
    esc(){ if(started && $("m-reg").classList.contains("on")){ closeReg(); return true; } return false; }
  };
})();

if (typeof module !== "undefined" && module.exports)
  module.exports = { M_STABLE, M_CACHE_V, mNormalize, mPack, mUnpack, mValid, mStale, mMatches, mSample,
    mIndex, mInCountry };
