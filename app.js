// Paths to your CSV files
const eventsFile = 'tables/events.csv';
const eventTypesFile = 'tables/eventtypes.csv';
const eventsArtistsVenuesFile = 'tables/eventsartistsvenues.csv';
const artistsFile = 'tables/artists.csv';
const venuesFile = 'tables/venues.csv';

// Global storage
let eventsData = [];
let eventTypesData = [];
let eventsArtistsVenuesData = [];
let artistsData = [];
let venuesData = [];

// Use Promise.all to fetch all data
Promise.all([
    fetch(eventTypesFile).then(response => {
        if (!response.ok) throw new Error('Failed to load event types CSV');
        return response.text();
    }),
    fetch(eventsArtistsVenuesFile).then(response => {
        if (!response.ok) throw new Error('Failed to load events artists venues CSV');
        return response.text();
    }),
    fetch(artistsFile).then(response => {
        if (!response.ok) throw new Error('Failed to load artists CSV');
        return response.text();
    }),
    fetch(venuesFile).then(response => {
        if (!response.ok) throw new Error('Failed to load venues CSV');
        return response.text();
    }),
])
    .then(([eventTypesCSV, eventsArtistsVenuesCSV, artistsCSV, venuesCSV]) => {
        // Parse and store data
        eventTypesData = Papa.parse(eventTypesCSV, { header: true, delimiter: ';' }).data;
		
		// Clean the data here
        eventTypesData = eventTypesData.map(row => {
            return Object.fromEntries(
                Object.entries(row).map(([key, value]) => [key, value.trim().replace(/\r/g, '')])
            );
        });
		
		
        eventsArtistsVenuesData = Papa.parse(eventsArtistsVenuesCSV, { header: true, delimiter: ';' }).data;
		
		// Clean the data here
        eventsArtistsVenuesData = eventsArtistsVenuesData.map(row => {
            return Object.fromEntries(
                Object.entries(row).map(([key, value]) => [key, value.trim().replace(/\r/g, '')])
            );
        });
		
        artistsData = Papa.parse(artistsCSV, { header: true, delimiter: ';' }).data;
		
		// Clean the data here
        artistsData = artistsData.map(row => {
            return Object.fromEntries(
                Object.entries(row).map(([key, value]) => [key, value.trim().replace(/\r/g, '')])
            );
        });
		
        venuesData = Papa.parse(venuesCSV, { header: true, delimiter: ';' }).data;
		
		// Clean the data here
        venuesData = venuesData.map(row => {
            return Object.fromEntries(
                Object.entries(row).map(([key, value]) => [key, value.trim().replace(/\r/g, '')])
            );
        });

        console.log('All data loaded and parsed');

        // Call the function to load the events data into the table
        fetchAndLoadEvents();
    })
    .catch(error => {
        console.error('Error loading data:', error);
    });

// Fetch and parse the events CSV after loading the other data
function fetchAndLoadEvents() {
    fetch(eventsFile)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load events CSV');
            return response.text();
        })
        .then(csv => {
            eventsData = Papa.parse(csv, { header: true, delimiter: ';' }).data;
            console.log('Events Data:', eventsData); // Debugging log
            loadEventsTable(eventsData);
        })
        .catch(error => console.error('Error loading events CSV:', error));
}

// Optional: Add sorting functionality for the Date column when clicked
let sortAscending = true;  // Keep track of the sorting direction (ascending or descending)

// Function to load the events data into the table
function loadEventsTable(eventsData) {
    const tableBody = document.getElementById('eventTableBody');


	if (sortAscending) 
        eventsData.sort((a, b) => new Date(a.Date) - new Date(b.Date));  // Ascending order
	else 
        eventsData.sort((a, b) => new Date(b.Date) - new Date(a.Date));  // Descending order

    // Loop through the sorted events and populate the table
    eventsData.forEach(event => {
        const row = document.createElement('tr');
        row.classList.add('event-row');
        row.setAttribute('data-id', event.id); // Set data-id attribute for later use

        // Find the event type description by matching the 'type' field with eventTypesData
        const eventType = eventTypesData.find(type => type.id == event.type);
        const eventTypeDescription = eventType ? eventType.type : 'Unknown'; // Default to 'Unknown' if not found

        row.innerHTML = `
            <td>${event.Date}</td>
            <td>${event.title}</td>
            <td>${eventTypeDescription}</td>
            <td>${event.Rate}</td>
        `;

        // Create expandable details row for each event
        const detailsRow = document.createElement('tr');
        detailsRow.classList.add('details-row');
        detailsRow.style.display = 'none'; // Hide by default
        detailsRow.setAttribute('data-id', event.id); // Match it with the event id
        detailsRow.innerHTML = `
            <td colspan="4">
                <div id="eventDetails-${event.id}" style="padding: 10px;">
                    <h3>Artists:</h3>
                    <ul id="artistsList-${event.id}"></ul>
                    <h3>Venue:</h3>
                    <p id="venueDetails-${event.id}"></p>
                </div>
            </td>
        `;

        // Add row and details row to the table
        tableBody.appendChild(row);
        tableBody.appendChild(detailsRow);

        // Add event listener to toggle details when clicking on a row
        row.addEventListener('click', () => toggleDetails(event.id));
    });
}

// Function to toggle the details visibility
function toggleDetails(eventId) {
    const detailsRow = document.querySelector(`.details-row[data-id='${eventId}']`);
    const artistsList = document.getElementById(`artistsList-${eventId}`);
    const venueDetails = document.getElementById(`venueDetails-${eventId}`);

    // If the row is already expanded, collapse it
    if (detailsRow.style.display === 'none') {
        // Find the artists for this event
        const artistsForEvent = eventsArtistsVenuesData.filter(row => row.eventid == eventId);
		
		if (!artistsForEvent || artistsForEvent.length === 0) {
			console.warn(`No artists found for event ID: ${eventId}`);
		}
		
        artistsList.innerHTML = ''; // Clear the previous list
        artistsForEvent.forEach(eventArtist => {
            const artist = artistsData.find(artist => artist.id == eventArtist.artistid);
            if (artist) {
                const artistItem = document.createElement('li');
                artistItem.textContent = artist.Name;
                artistsList.appendChild(artistItem);
            }
        });

        // Find the venue for this event
        const venueForEvent = venuesData.find(venue => venue.id == artistsForEvent[0].venueid);
		

console.log('artistsForEvent:', artistsForEvent);
console.log('Looking for venue ID:', artistsForEvent[0]?.venueid);
console.log('venuesData:', venuesData);
console.log('Result for venue search:', venueForEvent);
		
		if (!venueForEvent) {
			console.warn(`No venue found for event ID: ${eventId}`);
		}
		
        if (venueForEvent) {
            venueDetails.textContent = `${venueForEvent.name}, ${venueForEvent.City}, ${venueForEvent.Country}`;
        }

        // Show the details row
        detailsRow.style.display = '';
    } else {
        // Collapse the details row
        detailsRow.style.display = 'none';
    }
}

// Function to filter the table based on the input field
function filterTable() {
    const filter = document.getElementById('filterInput').value.toLowerCase();
    const rows = document.querySelectorAll('#eventTableBody tr');
    let visibleRowCount = 0;

    rows.forEach(row => {
        if (row.classList.contains('event-row')) {
            const cells = row.getElementsByTagName('td');
            const title = cells[1].textContent.toLowerCase();
            const type = cells[2].textContent.toLowerCase();

            // Get the event id to filter the artists and venue
            const eventId = row.getAttribute('data-id');
            const artistsForEvent = eventsArtistsVenuesData.filter(row => row.eventid == eventId);
            const venueForEvent = venuesData.find(venue => venue.id == artistsForEvent[0]?.venueid);
            
            // Check if any artist or venue matches the filter
            let artistsMatch = false;
            artistsForEvent.forEach(eventArtist => {
                const artist = artistsData.find(artist => artist.id == eventArtist.artistid);
                if (artist && artist.Name.toLowerCase().includes(filter)) {
                    artistsMatch = true;
                }
            });

            const venueMatch = venueForEvent && (venueForEvent.name.toLowerCase().includes(filter) || venueForEvent.City.toLowerCase().includes(filter));

            // If the filter matches the event title, type, artist, or venue, show the row
            if (title.includes(filter) || type.includes(filter) || artistsMatch || venueMatch) {
                row.style.display = '';
                // Show the details row as well if the event row is visible
                const detailsRow = document.querySelector(`.details-row[data-id='${eventId}']`);
                detailsRow.style.display = 'none'; // Keep it collapsed after search

                // Increment the count of visible rows
                visibleRowCount++;
            } else {
                row.style.display = 'none';
                // Hide the details row as well
                const detailsRow = document.querySelector(`.details-row[data-id='${eventId}']`);
                detailsRow.style.display = 'none'; // Hide the details row
            }
        }
    });

    // Update the visible row count
    document.getElementById('rowCount').textContent = visibleRowCount;
}

document.getElementById('dateHeader').addEventListener('click', () => {
    // Toggle the sorting direction for next click
    sortAscending = !sortAscending;

    // Re-load the table with sorted data
    loadEventsTable(eventsData);
});
