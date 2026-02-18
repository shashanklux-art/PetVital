// Vets finder page logic

let allClinics = [];

// Initialize vets page
async function initVetsPage() {
  const session = await requireAuth();
  if (!session) return;

  await loadClinics();
  initSearch();
}

// Load clinics
async function loadClinics() {
  const container = document.getElementById('vets-list');

  try {
    const data = await vetsApi.getAll();
    allClinics = data.clinics || [];
    renderClinics(allClinics);
  } catch (error) {
    console.error('Error loading clinics:', error);
    container.innerHTML = '<p class="empty-state">Failed to load vet clinics.</p>';
  }
}

// Render clinics
function renderClinics(clinics) {
  const container = document.getElementById('vets-list');

  if (clinics.length === 0) {
    container.innerHTML = '<p class="empty-state">No vet clinics found matching your criteria.</p>';
    return;
  }

  container.innerHTML = clinics.map(clinic => `
    <div class="vet-card">
      <div class="vet-card-header">
        <h3>${escapeHtml(clinic.name)}</h3>
        <div class="vet-badges">
          ${clinic.is_emergency ? '<span class="vet-badge emergency">Emergency</span>' : ''}
          ${clinic.is_24_hour ? '<span class="vet-badge hour-24">24 Hour</span>' : ''}
        </div>
      </div>
      <div class="vet-card-body">
        <p>${escapeHtml(clinic.address)}</p>
        <p>${escapeHtml(clinic.city)}${clinic.state ? ', ' + escapeHtml(clinic.state) : ''} ${escapeHtml(clinic.zip_code || '')}</p>
        ${clinic.phone ? `<p><strong>Phone:</strong> ${escapeHtml(clinic.phone)}</p>` : ''}

        ${clinic.rating ? `
          <div class="vet-rating">
            <span>⭐ ${clinic.rating.toFixed(1)}</span>
            <span>(${clinic.review_count} reviews)</span>
          </div>
        ` : ''}

        ${clinic.services?.length ? `
          <div class="vet-services">
            ${clinic.services.map(s => `<span class="service-tag">${escapeHtml(s)}</span>`).join('')}
          </div>
        ` : ''}
      </div>
      <div class="vet-card-footer">
        ${clinic.phone ? `<a href="tel:${clinic.phone}" class="btn btn-primary btn-small">Call Now</a>` : ''}
        ${clinic.latitude && clinic.longitude ? `
          <a href="https://www.google.com/maps/search/?api=1&query=${clinic.latitude},${clinic.longitude}" target="_blank" class="btn btn-secondary btn-small">Get Directions</a>
        ` : ''}
        ${clinic.website ? `<a href="${clinic.website}" target="_blank" class="btn btn-secondary btn-small">Website</a>` : ''}
      </div>
    </div>
  `).join('');
}

// Initialize search
function initSearch() {
  document.getElementById('search-btn')?.addEventListener('click', applyFilters);

  // Allow enter key in city input
  document.getElementById('filter-city')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      applyFilters();
    }
  });
}

// Apply filters
function applyFilters() {
  const city = document.getElementById('filter-city').value.trim().toLowerCase();
  const emergencyOnly = document.getElementById('filter-emergency').checked;
  const is24Hour = document.getElementById('filter-24hour').checked;

  let filtered = allClinics;

  if (city) {
    filtered = filtered.filter(c =>
      c.city.toLowerCase().includes(city) ||
      c.address.toLowerCase().includes(city)
    );
  }

  if (emergencyOnly) {
    filtered = filtered.filter(c => c.is_emergency);
  }

  if (is24Hour) {
    filtered = filtered.filter(c => c.is_24_hour);
  }

  renderClinics(filtered);
}

// Helper functions
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Initialize on page load
initVetsPage();
