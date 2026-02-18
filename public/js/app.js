// Dashboard application logic

let currentUser = null;
let pets = [];

// Initialize dashboard
async function initDashboard() {
  const session = await requireAuth();
  if (!session) return;

  currentUser = session.user;

  // Set user name
  const userName = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
  document.getElementById('user-name').textContent = userName;

  // Set current date
  const dateEl = document.getElementById('current-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Load data
  await Promise.all([
    loadPets(),
    loadRecentHistory(),
    loadRecentJournal()
  ]);
}

// Load pets
async function loadPets() {
  const grid = document.getElementById('pets-grid');

  try {
    const data = await petsApi.getAll();
    pets = data.pets || [];
    renderPets(pets, grid);
  } catch (error) {
    console.error('Error loading pets:', error);
    grid.innerHTML = '<p class="empty-state">Failed to load pets. Please try again.</p>';
  }
}

// Render pets grid
function renderPets(pets, container) {
  if (pets.length === 0) {
    container.innerHTML = `
      <p class="empty-state">
        No pets added yet. <a href="/add-pet.html">Add your first pet</a>
      </p>
    `;
    return;
  }

  container.innerHTML = pets.map(pet => `
    <div class="pet-card">
      <div class="pet-icon">${pet.species === 'dog' ? '🐕' : '🐈'}</div>
      <h3>${escapeHtml(pet.name)}</h3>
      <p>${escapeHtml(pet.breed) || capitalize(pet.species)}</p>
      ${pet.age_years || pet.age_months ? `<p>${formatAge(pet.age_years, pet.age_months)}</p>` : ''}
      <a href="/triage.html?pet=${pet.id}" class="btn btn-primary btn-small">Check Symptoms</a>
    </div>
  `).join('');
}

// Load recent history
async function loadRecentHistory() {
  const list = document.getElementById('recent-history');

  try {
    const data = await triageApi.getHistory({ limit: 5 });
    const history = data.history || [];
    renderRecentHistory(history, list);
  } catch (error) {
    console.error('Error loading history:', error);
    list.innerHTML = '<p class="empty-state">Failed to load history.</p>';
  }
}

// Render recent history
function renderRecentHistory(history, container) {
  if (history.length === 0) {
    container.innerHTML = '<p class="empty-state">No symptom checks yet.</p>';
    return;
  }

  container.innerHTML = history.map(item => {
    const response = JSON.parse(item.ai_response);
    return `
      <div class="history-card" onclick="window.location.href='/history.html'">
        <div class="history-card-header">
          <span class="urgency-badge urgency-${item.urgency_level}">${item.urgency_level}</span>
          <span class="history-date">${formatDate(item.created_at)}</span>
        </div>
        <div class="history-card-body">
          <h3>${escapeHtml(item.pets?.name || 'Pet')}</h3>
          <p class="symptoms-preview">${item.symptoms.slice(0, 3).map(s => escapeHtml(s)).join(', ')}${item.symptoms.length > 3 ? '...' : ''}</p>
        </div>
      </div>
    `;
  }).join('');
}

// Load recent journal entries
async function loadRecentJournal() {
  const list = document.getElementById('recent-journal');

  try {
    const data = await journalApi.getAll({ limit: 5 });
    const entries = data.entries || [];
    renderRecentJournal(entries, list);
  } catch (error) {
    console.error('Error loading journal:', error);
    list.innerHTML = '<p class="empty-state">Failed to load journal.</p>';
  }
}

// Render recent journal
function renderRecentJournal(entries, container) {
  if (entries.length === 0) {
    container.innerHTML = '<p class="empty-state">No journal entries yet. <a href="/journal.html">Add your first entry</a></p>';
    return;
  }

  container.innerHTML = entries.map(entry => `
    <div class="journal-card" onclick="window.location.href='/journal.html'">
      <div class="journal-card-header">
        <span class="entry-type-badge ${entry.entry_type}">${ENTRY_TYPE_LABELS[entry.entry_type] || entry.entry_type}</span>
        <span class="history-date">${formatDate(entry.entry_date)}</span>
      </div>
      <div class="journal-card-body">
        <h3>${escapeHtml(entry.pets?.name || 'Pet')}</h3>
        ${entry.title ? `<p><strong>${escapeHtml(entry.title)}</strong></p>` : ''}
        ${entry.content ? `<p>${escapeHtml(entry.content.substring(0, 100))}${entry.content.length > 100 ? '...' : ''}</p>` : ''}
      </div>
    </div>
  `).join('');
}

// Helper functions
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatAge(years, months) {
  const parts = [];
  if (years) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
  if (months) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
  return parts.join(', ') || 'Age unknown';
}

// Initialize on page load
initDashboard();
