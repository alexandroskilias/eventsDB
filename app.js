const eventsFile = 'tables/events.csv';
const eventTypesFile = 'tables/eventtypes.csv';
const eventsArtistsVenuesFile = 'tables/eventsartistsvenues.csv';
const artistsFile = 'tables/artists.csv';
const venuesFile = 'tables/venues.csv';

let eventsData = [];
let sortAsc = false;
let allExpanded = false; 
let filterNoImage = false; 

// Fast Lookup Maps (O(1) Instant Performance)
const typesMap = new Map();
const artistsMap = new Map();
const venuesMap = new Map();
const eavMap = new Map();

Promise.all([
    fetch(eventTypesFile).then(res => res.text()),
    fetch(eventsArtistsVenuesFile).then(res => res.text()),
    fetch(artistsFile).then(res => res.text()),
    fetch(venuesFile).then(res => res.text()),
    fetch(eventsFile).then(res => res.text())
]).then(([types, eav, artists, venues, events]) => {
    const rawTypes = Papa.parse(types, { header: true, delimiter: ';' }).data.map(clean);
    const rawEav = Papa.parse(eav, { header: true, delimiter: ';' }).data.map(clean);
    const rawArtists = Papa.parse(artists, { header: true, delimiter: ';' }).data.map(clean);
    const rawVenues = Papa.parse(venues, { header: true, delimiter: ';' }).data.map(clean);
    eventsData = Papa.parse(events, { header: true, delimiter: ';' }).data.map(clean);

    // Build Instant Indexing Hash Maps
    rawTypes.forEach(t => typesMap.set(t.id, t));
    rawArtists.forEach(a => artistsMap.set(a.id, a));
    rawVenues.forEach(v => venuesMap.set(v.id, v));

    rawEav.forEach(row => {
        if (!eavMap.has(row.eventid)) eavMap.set(row.eventid, []);
        eavMap.get(row.eventid).push(row);
    });

    // Pre-build search cache strings so typing into filter is instantaneous
    eventsData.forEach(event => {
        if (!event.id) return;
        const type = typesMap.get(event.type);
        const eavs = eavMap.get(event.id) || [];
        const artistNames = eavs.map(e => artistsMap.get(e.artistid)?.Name || '').join(' ');
        const venue = eavs[0] ? venuesMap.get(eavs[0].venueid) : null;
        const venueText = venue ? `${venue.name} ${venue.City} ${venue.Country}` : '';

        event._searchStr = `${event.id} ${event.Date} ${event.title} ${type ? type.type : ''} ${event.Rate}/5 ${artistNames} ${venueText}`.toLowerCase();
    });

    loadTable(eventsData);
});

function clean(row) {
    return Object.fromEntries(Object.entries(row).map(([k, v]) => [k, (v || "").trim()]));
}

function loadTable(data) {
    const tbody = document.getElementById('eventTableBody');
    tbody.innerHTML = '';
    data.sort((a, b) => sortAsc ? a.Date.localeCompare(b.Date) : b.Date.localeCompare(a.Date));

    allExpanded = false;
    const btn = document.getElementById('toggleAllBtn');
    if(btn) btn.textContent = "Expand All";

    // Use DocumentFragment to batch DOM inserts (Prevents Reflows)
    const fragment = document.createDocumentFragment();

    data.forEach(event => {
        if(!event.id) return;
        const type = typesMap.get(event.type);
        
        const tr = document.createElement('tr');
        tr.className = 'event-row';
        tr.setAttribute('data-id', event.id);
        tr.setAttribute('data-has-image', 'true');
        tr.setAttribute('data-search', event._searchStr || '');
        tr.innerHTML = `<td><code>#${event.id}</code></td><td>${event.Date}</td><td><strong>${event.title}</strong></td><td>${type ? type.type : ''}</td><td>${event.Rate}/5</td>`;

        const dr = document.createElement('tr');
        dr.className = 'details-row';
        dr.style.display = 'none';
        dr.setAttribute('data-id', event.id);
        dr.innerHTML = `
            <td colspan="5">
                <div class="expand-container">
                    <div id="imgCont-${event.id}" class="image-box" style="display:none;" onclick="openModal(this)">
                        <img id="img-${event.id}" class="event-hero-img">
                    </div>
                    <div class="info-box">
                        <h3>Artists</h3>
                        <ul id="art-${event.id}" class="artist-list"></ul>
                        <h3>Location</h3>
                        <p id="ven-${event.id}" class="venue-text"></p>
                    </div>
                </div>
            </td>`;
        
        fragment.appendChild(tr);
        fragment.appendChild(dr);
        
        tr.onclick = (e) => {
            if(!e.target.closest('.image-box')) toggle(event.id);
        };
    });
    
    tbody.appendChild(fragment);
    filterTable();
}

function toggle(id, forceState) {
    const dr = document.querySelector(`.details-row[data-id='${id}']`);
    const img = document.getElementById(`img-${id}`);
    const cont = document.getElementById(`imgCont-${id}`);

    const targetState = forceState !== undefined ? forceState : (dr.style.display === 'none' ? 'show' : 'hide');

    if (targetState === 'show') {
        // 1. Show row structure immediately
        dr.style.display = '';

        // 2. Fetch image lazily on demand
        if (!img.src || img.src === window.location.href) {
            const extensions = ['JPG', 'png', 'webp', 'avif', 'jpeg', 'gif'];
            img.onload = () => { cont.style.display = 'block'; };
            img.onerror = () => tryNext(img, id, extensions, cont);
            img.src = `tables/EventImages/${id}.jpg`;
        }

        // 3. Instant O(1) map resolution for details
        const eav = eavMap.get(id) || [];
        const list = document.getElementById(`art-${id}`);
        list.innerHTML = '';

        eav.forEach(row => {
            const a = artistsMap.get(row.artistid);
            if(a) {
                const li = document.createElement('li');
                const star = row.headliner == 1 ? '<span style="color:#f1c40f;">&#9733;</span> ' : '';
                li.innerHTML = `${star}${a.Name}`;
                list.appendChild(li);
            }
        });

        const venueRecord = eav[0] ? venuesMap.get(eav[0].venueid) : null;
        if(venueRecord) {
            document.getElementById(`ven-${id}`).innerHTML = `<strong>${venueRecord.name}</strong><br>${venueRecord.City}, ${venueRecord.Country}`;
        }
    } else {
        dr.style.display = 'none';
    }
}

function tryNext(el, id, exts, cont) {
    if (exts.length === 0) {
        cont.style.display = 'none';
        const mainRow = document.querySelector(`.event-row[data-id='${id}']`);
        if (mainRow) mainRow.setAttribute('data-has-image', 'false');
        return;
    }
    el.src = `tables/EventImages/${id}.${exts.shift()}`;
}

function openModal(container) {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("fullImage");
    modal.style.display = "flex";
    modalImg.src = container.querySelector('img').src;
}

function closeModal() {
    document.getElementById("imageModal").style.display = "none";
}

function toggleNoImage_Filter() {
    const btn = document.getElementById('noImageBtn');
    filterNoImage = !filterNoImage;
    
    if (filterNoImage) {
        btn.classList.add('btn-active');
        btn.textContent = "Showing No Image Only";
    } else {
        btn.classList.remove('btn-active');
        btn.textContent = "Show No Image Only";
    }
    filterTable();
}

function filterTable() {
    const val = document.getElementById('filterInput').value.toLowerCase();
    const rows = document.querySelectorAll('.event-row');
    let count = 0;

    rows.forEach(r => {
        const searchStr = r.getAttribute('data-search');
        const hasImageAttr = r.getAttribute('data-has-image');
        
        let isMatch = searchStr.includes(val);

        if (filterNoImage && hasImageAttr !== 'false') {
            isMatch = false;
        }

        r.style.display = isMatch ? '' : 'none';
        
        const dr = document.querySelector(`.details-row[data-id='${r.getAttribute('data-id')}']`);
        if (dr) dr.style.display = 'none';

        if (isMatch) count++;
    });

    allExpanded = false;
    const toggleBtn = document.getElementById('toggleAllBtn');
    if (toggleBtn) toggleBtn.textContent = "Expand All";
    document.getElementById('rowCount').textContent = count;
}

function toggleAllRows() {
    const visibleRows = document.querySelectorAll('.event-row:not([style*="display: none"])');
    const btn = document.getElementById('toggleAllBtn');
    
    allExpanded = !allExpanded;
    
    visibleRows.forEach(r => {
        const id = r.getAttribute('data-id');
        toggle(id, allExpanded ? 'show' : 'hide');
    });

    btn.textContent = allExpanded ? "Collapse All" : "Expand All";
}