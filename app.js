const eventsFile = 'tables/events.csv';
const eventTypesFile = 'tables/eventtypes.csv';
const eventsArtistsVenuesFile = 'tables/eventsartistsvenues.csv';
const artistsFile = 'tables/artists.csv';
const venuesFile = 'tables/venues.csv';

let eventsData = [], eventTypesData = [], eventsArtistsVenuesData = [], artistsData = [], venuesData = [];
let sortAsc = false;

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

    data.forEach(event => {
        if(!event.id) return;
        const type = eventTypesData.find(t => t.id == event.type);
        const tr = document.createElement('tr');
        tr.className = 'event-row';
        tr.setAttribute('data-id', event.id);
        tr.innerHTML = `<td>${event.Date}</td><td><strong>${event.title}</strong></td><td>${type ? type.type : ''}</td><td>${event.Rate}/5</td>`;

        const dr = document.createElement('tr');
        dr.className = 'details-row';
        dr.style.display = 'none';
        dr.setAttribute('data-id', event.id);
        dr.innerHTML = `
            <td colspan="4">
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
            // Prevent expanding/collapsing if we clicked the image container directly
            if(!e.target.closest('.image-box')) toggle(event.id);
        };
    });
    document.getElementById('rowCount').textContent = data.length;
}

function toggle(id) {
    const dr = document.querySelector(`.details-row[data-id='${id}']`);
    const img = document.getElementById(`img-${id}`);
    const cont = document.getElementById(`imgCont-${id}`);

    if (dr.style.display === 'none') {
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
        return;
    }
    el.src = `tables/EventImages/${id}.${exts.shift()}`;
}

// FULL SCREEN MODAL LOGIC
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

function filterTable() {
    const val = document.getElementById('filterInput').value.toLowerCase();
    const rows = document.querySelectorAll('.event-row');
    let count = 0;

    rows.forEach(r => {
        const id = r.getAttribute('data-id');
        
        // 1. Check main row text (Date, Title, Type, Rating)
        const rowText = r.innerText.toLowerCase();

        // 2. Map and match across data arrays to find the hidden artists
        const matchingEAV = eventsArtistsVenuesData.filter(eav => eav.eventid == id);
        const artistNames = matchingEAV.map(eav => {
            const artist = artistsData.find(a => a.id == eav.artistid);
            return artist ? artist.Name.toLowerCase() : '';
        });

        // 3. Evaluate if search input hits row data OR any artist names
        const matchesRowText = rowText.includes(val);
        const matchesArtist = artistNames.some(name => name.includes(val));

        const isMatch = matchesRowText || matchesArtist;

        // 4. Update row visibility
        r.style.display = isMatch ? '' : 'none';
        
        // Auto-collapse details row to avoid broken layout fragments when filtering
        const dr = document.querySelector(`.details-row[data-id='${id}']`);
        if (dr) dr.style.display = 'none';

        if (isMatch) count++;
    });

    document.getElementById('rowCount').textContent = count;
}