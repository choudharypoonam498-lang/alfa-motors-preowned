const C = window.ALFA, $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
// contact details from config.js
$$('[data-c=tel]').forEach(a => { a.href = 'tel:+91' + C.phone; if (a.tagName === 'A' && !a.closest('.bottom')) a.textContent = C.phone; });
$$('[data-c=wa]').forEach(a => a.href = 'https://wa.me/' + C.whatsapp);
$$('[data-c=mail]').forEach(a => { a.href = 'mailto:' + C.email; a.textContent = C.email; });
$$('[data-c=hours]').forEach(e => e.textContent = C.hours);
$('#mapsLink').href = C.mapsUrl;
const wa = t => window.open('https://wa.me/' + C.whatsapp + '?text=' + encodeURIComponent(t), '_blank');
$$('[data-enq]').forEach(b => b.onclick = () => wa('Hello ALFA MOTORS, I want to enquire about: ' + b.dataset.enq));

// save to Supabase; if not connected, fall back to WhatsApp (never pretend it was saved)
const connected = () => C.supabaseUrl && C.supabaseKey;
async function save(table, data) {
  const r = await fetch(C.supabaseUrl + '/rest/v1/' + table, { method: 'POST',
    headers: { apikey: C.supabaseKey, Authorization: 'Bearer ' + C.supabaseKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(data) });
  if (!r.ok) throw new Error(await r.text());
}
function msg(el, type, text) { el.className = 'msg ' + type; el.textContent = text; }
function handle(formId, msgId, table, title, extra) {
  const f = $(formId), m = $(msgId);
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f)); if (extra) Object.assign(d, extra);
    const lines = Object.entries(d).map(([k, v]) => k.replace('_', ' ') + ': ' + v).join('\n');
    if (!connected()) { msg(m, 'warn', 'Online saving is not connected yet. Opening WhatsApp so you can send this to Alfa Motors.'); wa(title + '\n' + lines); return; }
    try { await save(table, d); msg(m, 'ok', 'Received. Alfa Motors will call you to confirm.'); f.reset(); }
    catch (err) { msg(m, 'err', 'Could not send. Please call ' + C.phone + ' or use WhatsApp.'); }
  });
}
handle('#bookForm', '#bookMsg', 'bookings', 'New service booking');
handle('#sellForm', '#sellMsg', 'car_leads', 'Sell my car', { type: 'sell' });
handle('#revForm', '#revMsg', 'reviews', 'Review', { approved: false });

// approved reviews only (empty state stays if none)
if (connected()) fetch(C.supabaseUrl + '/rest/v1/reviews?approved=eq.true&select=customer_name,vehicle_service,rating,body&order=created_at.desc&limit=12',
  { headers: { apikey: C.supabaseKey, Authorization: 'Bearer ' + C.supabaseKey } }).then(r => r.json()).then(rows => {
  if (!Array.isArray(rows) || !rows.length) return;
  const box = $('#revList'); box.innerHTML = '';
  rows.forEach(v => { const d = document.createElement('div'); d.className = 'rev';
    const s = document.createElement('div'); s.className = 'st'; s.textContent = '★'.repeat(v.rating || 5);
    const p = document.createElement('p'); p.textContent = v.body;
    const n = document.createElement('b'); n.textContent = v.customer_name + (v.vehicle_service ? ' · ' + v.vehicle_service : '');
    d.append(s, p, n); box.append(d); });
}).catch(() => {});

// roadside flow
const S = { step: 0, loc: '', lat: null, lng: null, problem: '', car: '', registration: '', fuel: 'Petrol', transmission: 'Manual', name: '', phone: '', whatsapp: '', description: '' };
const problems = ["Car won't start", 'Battery problem', 'Tyre / puncture', 'Engine problem', 'Electrical problem', 'AC problem', 'Fuel-related problem', 'Warning light', 'Accident / minor breakdown', 'Other'];
const titles = ['Where are you?', 'What is wrong?', 'Your car and you', 'Confirm request'];
const modal = $('#sosModal'), stepEl = $('#step'), sm = $('#sosMsg');
const fld = (l, k, t = 'text', req = true) => `<label>${l}<input data-k="${k}" type="${t}" value="${S[k] || ''}" ${req ? 'required' : ''}></label>`;
function render() {
  $('#dots').innerHTML = titles.map((_, i) => `<i class="${i <= S.step ? 'on' : ''}"></i>`).join('');
  sm.className = 'msg'; $('#back').style.visibility = S.step ? 'visible' : 'hidden';
  $('#next').textContent = S.step === 3 ? 'Request Alfa assistance' : 'Next';
  let h = `<p class="lead" style="margin-bottom:14px">${titles[S.step]}</p>`;
  if (S.step === 0) h += `<button class="btn" id="geo" style="width:100%;margin-bottom:12px">📍 Use my current location</button>
    <div id="geoNote" class="note" style="margin:0 0 12px">${S.lat ? 'Location captured.' : 'Your browser will ask permission only after you tap the button.'}</div>
    <label>Or type your location / landmark<input data-k="loc" value="${S.loc}" placeholder="Area, road, landmark"></label>`;
  if (S.step === 1) h += `<div class="opts">${problems.map(p => `<button class="opt ${S.problem === p ? 'on' : ''}" data-p="${p}">${p}</button>`).join('')}</div>
    <label style="margin-top:12px">Describe the problem (optional)<textarea data-k="description">${S.description}</textarea></label>`;
  if (S.step === 2) h += `<div class="row">${fld('Car brand and model', 'car')}${fld('Registration number', 'registration', 'text', false)}</div>
    <div class="row"><label>Fuel<select data-k="fuel">${['Petrol', 'Diesel', 'CNG', 'Electric'].map(x => `<option ${S.fuel === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
    <label>Transmission<select data-k="transmission">${['Manual', 'Automatic'].map(x => `<option ${S.transmission === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label></div>
    <div class="row">${fld('Your name', 'name')}${fld('Mobile number', 'phone', 'tel')}</div>${fld('WhatsApp number (optional)', 'whatsapp', 'tel', false)}`;
  if (S.step === 3) h += `<div class="sum"><div><span>Location</span>${S.lat ? 'GPS captured' + (S.loc ? ' · ' + S.loc : '') : S.loc}</div><div><span>Problem</span>${S.problem}</div><div><span>Car</span>${S.car} ${S.registration}</div><div><span>Name</span>${S.name}</div><div><span>Phone</span>${S.phone}</div></div><p class="note">Alfa will call to confirm availability and any service fee. No fee is charged by this form.</p>`;
  stepEl.innerHTML = h;
  $$('[data-k]', stepEl).forEach(i => i.oninput = () => S[i.dataset.k] = i.value);
  $$('[data-p]', stepEl).forEach(b => b.onclick = () => { S.problem = b.dataset.p; $$('[data-p]', stepEl).forEach(x => x.classList.toggle('on', x === b)); });
  const g = $('#geo'); if (g) g.onclick = () => {
    if (!navigator.geolocation) return $('#geoNote').textContent = 'Location is not available on this device. Type your location instead.';
    $('#geoNote').textContent = 'Getting location…';
    navigator.geolocation.getCurrentPosition(p => { S.lat = p.coords.latitude; S.lng = p.coords.longitude; $('#geoNote').textContent = 'Location captured.'; },
      () => $('#geoNote').textContent = 'Permission denied. Please type your location instead.', { enableHighAccuracy: true, timeout: 15000 });
  };
}
function valid() {
  if (S.step === 0 && !S.lat && !S.loc.trim()) return 'Share your location or type it.';
  if (S.step === 1 && !S.problem) return 'Choose what is wrong.';
  if (S.step === 2 && (!S.car.trim() || !S.name.trim() || !/^\d{10}$/.test(S.phone.replace(/\D/g, '').slice(-10)))) return 'Enter your car, name and a 10-digit mobile number.';
  return '';
}
$$('[data-sos]').forEach(b => b.onclick = () => { S.step = 0; modal.classList.add('open'); render(); });
modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') modal.classList.remove('open'); });
$('#back').onclick = () => { S.step--; render(); };
$('#next').onclick = async () => {
  const err = valid(); if (err) return msg(sm, 'err', err);
  if (S.step < 3) { S.step++; return render(); }
  const row = { location_text: S.loc, latitude: S.lat, longitude: S.lng, problem: S.problem, car: S.car, registration: S.registration, fuel: S.fuel, transmission: S.transmission, name: S.name, phone: S.phone, whatsapp: S.whatsapp, description: S.description };
  const map = S.lat ? `\nMap: https://maps.google.com/?q=${S.lat},${S.lng}` : '';
  const text = `ROADSIDE HELP\nProblem: ${S.problem}\nCar: ${S.car} ${S.registration}\nName: ${S.name}\nPhone: ${S.phone}\nLocation: ${S.loc}${map}`;
  if (!connected()) { msg(sm, 'warn', 'Online saving is not connected yet. Opening WhatsApp to send your request to Alfa Motors. You can also call ' + C.phone + '.'); wa(text); return; }
  try { await save('roadside_requests', row); msg(sm, 'ok', 'Request received. Alfa Motors will call you shortly. For urgent help call ' + C.phone + '.'); $('#next').style.display = 'none'; }
  catch (e) { msg(sm, 'err', 'Could not send. Please call ' + C.phone + ' now.'); }
};

// counters + reveal
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return; e.target.classList.add('in'); io.unobserve(e.target);
  if (e.target.dataset.count) { const t = +e.target.dataset.count, plain = 'plain' in e.target.dataset; let s = null;
    const f = ts => { s = s || ts; const p = Math.min((ts - s) / 1200, 1), v = Math.round(t * p);
      e.target.textContent = (plain ? v : v.toLocaleString('en-IN')) + (e.target.dataset.suffix || ''); if (p < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f); }
}), { threshold: .25 });
$$('.reveal,[data-count]').forEach(el => io.observe(el));
