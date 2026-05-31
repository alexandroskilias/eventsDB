const eventsFile = 'tables/events.csv';
const eventTypesFile = 'tables/eventtypes.csv';
const eventsArtistsVenuesFile = 'tables/eventsartistsvenues.csv';
const artistsFile = 'tables/artists.csv';
const venuesFile = 'tables/venues.csv';

let eventsData = [], eventTypesData = [], eventsArtistsVenuesData = [], artistsData = [], venuesData = [];
let sortAsc = false;
let allExpanded = false; // Tracks global expand/collapse state
let filterNoImage = false; // Tracks if "Show No Image Only" filter is active

Promise.all([
    fetch(eventTypesFile).then(res => res.text()),
    fetch(eventsArtistsVenuesFile).then(res => res.text()),
    fetch(artistsFile).then(res => res.text()),
    fetch(venuesFile).then(res => res.text()),
    fetch(eventsFile).then(res => res.text())
]).then(([types, eav, artists, venues, events]) => {
    eventTypesData = Papa.parse(types, { header: true, delimiter: ';' }).data.map(clean);
    eventsArtistsVenuesData = Papa.parse(eav, { header: true, delimiter: ';' }).data.map(clean);
    artistsData = Papa.parse(artists, { header: true, delimiter: ';' }).data.map(clean);
    venuesData = Papa.parse(venues, { header: true, delimiter: ';' }).data.map(clean);
    eventsData = Papa.parse(events, { header: true, delimiter: ';' }).data.map(clean);
    loadTable(eventsData);
});

function clean(row) {
    return Object.fromEntries(Object.entries(row).map(([k, v]) => [k, (v || "").trim()]));
}

function loadTable(data) {
    const tbody = document.getElementById('eventTableBody');
    tbody.innerHTML = '';
    data.sort((a, b) => sortAsc ? a.Date.localeCompare(b.Date) : b.Date.localeCompare(a.Date));

    // Reset button state whenever table reloads/resorts
    allExpanded = false;
    const btn = document.getElementById('toggleAllBtn');
    if(btn) btn.textContent = "Expand All";

    data.forEach(event => {
        if(!event.id) return;
        const type = eventTypesData.find(t => t.id == event.type);
        const tr = document.createElement('tr');
        tr.className = 'event-row';
        tr.setAttribute('data-id', event.id);
        tr.setAttribute('data-has-image', 'true'); // Assume true by default until proven missing
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
        tbody.appendChild(tr);
        tbody.appendChild(dr);
        tr.onclick = (e) => {
            if(!e.target.closest('.image-box')) toggle(event.id);
        };

        // Proactively probe image existence ahead of opening to make filtering viable
        verifyImageExists(event.id, tr);
    });
    
    // Run filter matching layout rules
    filterTable();
}

// Background validation checker so filter status updates instantly 
function verifyImageExists(id, rowElement) {
    const testerImg = new Image();
    const extensions = ['png', 'webp', 'jpeg', 'JPG', 'avif', 'PNG', 'gif'];
    
    testerImg.onerror = () => {
        if (extensions.length === 0) {
            rowElement.setAttribute('data-has-image', 'false');
            // If active filter requires no image, make sure it reflects change dynamically
            if (filterNoImage) filterTable(); 
            return;
        }
        testerImg.src = `tables/EventImages/${id}.${extensions.shift()}`;
    };
    testerImg.src = `tables/EventImages/${id}.jpg`;
}

function toggle(id, forceState) {
    const dr = document.querySelector(`.details-row[data-id='${id}']`);
    const img = document.getElementById(`img-${id}`);
    const cont = document.getElementById(`imgCont-${id}`);

    const targetState = forceState !== undefined ? forceState : (dr.style.display === 'none' ? 'show' : 'hide');

    if (targetState === 'show') {
        if (!img.src || img.src === window.location.href) {
            cont.style.display = 'block';
            const extensions = ['png', 'webp', 'jpeg', 'JPG', 'avif', 'PNG', 'gif'];
            img.onerror = () => tryNext(img, id, extensions);
            img.src = `tables/EventImages/${id}.jpg`;
        }

        const eav = eventsArtistsVenuesData.filter(r => r.eventid == id);
        const list = document.getElementById(`art-${id}`);
        list.innerHTML = '';
        eav.forEach(row => {
            const a = artistsData.find(art => art.id == row.artistid);
            if(a) {
                const li = document.createElement('li');
                const star = row.headliner == 1 ? '<span style="color:#f1c40f;">&#9733;</span> ' : '';
                li.innerHTML = `${star}${a.Name}`;
                list.appendChild(li);
            }
        });

        const v = venuesData.find(ven => eav[0] && ven.id == eav[0].venueid);
        if(v) document.getElementById(`ven-${id}`).innerHTML = `<strong>${v.name}</strong><br>${v.City}, ${v.Country}`;
        dr.style.display = '';
    } else {
        dr.style.display = 'none';
    }
}

function tryNext(el, id, exts) {
    if (exts.length === 0) {
        document.getElementById(`imgCont-${id}`).style.display = 'none';
        const mainRow = document.querySelector(`.event-row[data-id='${id}']`);
        if (mainRow) mainRow.setAttribute('data-has-image', 'false');
        return;
    }
    el.src = `tables/EventImages/${id}.${exts.shift()}`;
}

function openModal(container) {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("fullImage");
    const clickedImg = container.querySelector('img');
    
    modal.style.display = "flex";
    modalImg.src = clickedImg.src;
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
        const id = r.getAttribute('data-id');
        const hasImageAttr = r.getAttribute('data-has-image');
        
        // 1. Check main row text (ID, Date, Title, Type, Rating)
        const rowText = r.innerText.toLowerCase();

        // 2. Fetch artist names for this event
        const matchingEAV = eventsArtistsVenuesData.filter(eav => eav.eventid == id);
        const artistNames = matchingEAV.map(eav => {
            const artist = artistsData.find(a => a.id == eav.artistid);
            return artist ? artist.Name.toLowerCase() : '';
        });

        // 3. Fetch venue information for this event (matching layout logic)
        const venueRecord = venuesData.find(ven => matchingEAV[0] && ven.id == matchingEAV[0].venueid);
        const venueName = venueRecord ? venueRecord.name.toLowerCase() : '';

        // 4. Evaluate if search matches row details, artists, OR the venue name
        const matchesRowText = rowText.includes(val);
        const matchesArtist = artistNames.some(name => name.includes(val));
        const matchesVenue = venueName.includes(val);

        let isMatch = matchesRowText || matchesArtist || matchesVenue;

        // 5. Additional Image filter rule
        if (filterNoImage && hasImageAttr !== 'false') {
            isMatch = false;
        }

        // 6. Toggle visibility
        r.style.display = isMatch ? '' : 'none';
        
        const dr = document.querySelector(`.details-row[data-id='${id}']`);
        if (dr) dr.style.display = 'none';

        if (isMatch) count++;
    });

    // Reset global toggle state on filtering
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