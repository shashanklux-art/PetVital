// Journal page logic

let allEntries = [];
let pets = [];
let selectedEntryId = null;
let isEditing = false;

// Initialize journal page
async function initJournalPage() {
  const session = await requireAuth();
  if (!session) return;

  await Promise.all([
    loadPets(),
    loadEntries()
  ]);

  initFilters();
  initModals();
  initTypeFields();
}

// Load pets
async function loadPets() {
  try {
    const data = await petsApi.getAll();
    pets = data.pets || [];
    populatePetSelects();
  } catch (error) {
    console.error('Error loading pets:', error);
  }
}

// Populate pet selects
function populatePetSelects() {
  // Filter dropdown
  const filterSelect = document.getElementById('filter-pet');
  pets.forEach(pet => {
    const option = document.createElement('option');
    option.value = pet.id;
    option.textContent = pet.name;
    filterSelect.appendChild(option);
  });

  // Entry form dropdown
  const entrySelect = document.getElementById('entry-pet');
  pets.forEach(pet => {
    const option = document.createElement('option');
    option.value = pet.id;
    option.textContent = pet.name;
    entrySelect.appendChild(option);
  });
}

// Load entries
async function loadEntries() {
  const container = document.getElementById('journal-list');

  try {
    const data = await journalApi.getAll();
    allEntries = data.entries || [];
    renderEntries(allEntries);
  } catch (error) {
    console.error('Error loading entries:', error);
    container.innerHTML = '<p class="empty-state">Failed to load journal entries.</p>';
  }
}

// Render entries
function renderEntries(entries) {
  const container = document.getElementById('journal-list');

  if (entries.length === 0) {
    container.innerHTML = `
      <p class="empty-state">
        No journal entries yet. Click "New Entry" to add one.
      </p>
    `;
    return;
  }

  container.innerHTML = entries.map(entry => `
    <div class="journal-card">
      <div class="journal-card-header">
        <span class="entry-type-badge ${entry.entry_type}">${ENTRY_TYPE_LABELS[entry.entry_type] || entry.entry_type}</span>
        <span class="history-date">${formatDate(entry.entry_date)}</span>
      </div>
      <div class="journal-card-body">
        <h3>${escapeHtml(entry.pets?.name || 'Pet')}</h3>
        ${entry.title ? `<p><strong>${escapeHtml(entry.title)}</strong></p>` : ''}
        ${entry.content ? `<p>${escapeHtml(entry.content)}</p>` : ''}
        ${renderMetadata(entry)}
      </div>
      <div class="journal-card-meta">
        <span>Added ${formatDate(entry.created_at, true)}</span>
        <div class="journal-card-actions">
          <button onclick="editEntry('${entry.id}')" title="Edit">✏️</button>
          <button class="delete" onclick="confirmDelete('${entry.id}')" title="Delete">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

// Render metadata based on entry type
function renderMetadata(entry) {
  if (!entry.metadata) return '';

  const meta = entry.metadata;
  let html = '';

  if (entry.entry_type === 'weight' && meta.weight) {
    html = `<p><strong>Weight:</strong> ${meta.weight} kg</p>`;
  } else if (entry.entry_type === 'medication') {
    if (meta.medication_name) html += `<p><strong>Medication:</strong> ${escapeHtml(meta.medication_name)}</p>`;
    if (meta.dosage) html += `<p><strong>Dosage:</strong> ${escapeHtml(meta.dosage)}</p>`;
  }

  return html;
}

// Initialize filters
function initFilters() {
  document.getElementById('filter-pet')?.addEventListener('change', applyFilters);
  document.getElementById('filter-type')?.addEventListener('change', applyFilters);
}

// Apply filters
function applyFilters() {
  const petFilter = document.getElementById('filter-pet').value;
  const typeFilter = document.getElementById('filter-type').value;

  let filtered = allEntries;

  if (petFilter) {
    filtered = filtered.filter(e => e.pet_id === petFilter);
  }

  if (typeFilter) {
    filtered = filtered.filter(e => e.entry_type === typeFilter);
  }

  renderEntries(filtered);
}

// Initialize modals
function initModals() {
  // Entry modal
  const entryModal = document.getElementById('entry-modal');
  const closeBtn = document.getElementById('close-modal');
  const cancelBtn = document.getElementById('cancel-entry');
  const newEntryBtn = document.getElementById('new-entry-btn');
  const entryForm = document.getElementById('entry-form');

  newEntryBtn?.addEventListener('click', openNewEntryModal);
  closeBtn?.addEventListener('click', closeEntryModal);
  cancelBtn?.addEventListener('click', closeEntryModal);
  entryModal?.querySelector('.modal-overlay')?.addEventListener('click', closeEntryModal);
  entryForm?.addEventListener('submit', handleEntrySubmit);

  // Delete modal
  const deleteModal = document.getElementById('delete-modal');
  const closeDeleteBtn = document.getElementById('close-delete-modal');
  const cancelDeleteBtn = document.getElementById('cancel-delete');
  const confirmDeleteBtn = document.getElementById('confirm-delete');

  closeDeleteBtn?.addEventListener('click', closeDeleteModal);
  cancelDeleteBtn?.addEventListener('click', closeDeleteModal);
  deleteModal?.querySelector('.modal-overlay')?.addEventListener('click', closeDeleteModal);
  confirmDeleteBtn?.addEventListener('click', handleDelete);
}

// Initialize type-specific fields
function initTypeFields() {
  const typeSelect = document.getElementById('entry-type');
  typeSelect?.addEventListener('change', () => {
    updateTypeFields(typeSelect.value);
  });
}

// Update type-specific fields visibility
function updateTypeFields(type) {
  document.querySelectorAll('.type-fields').forEach(el => {
    el.style.display = 'none';
  });

  if (type === 'weight') {
    document.getElementById('weight-fields').style.display = 'block';
  } else if (type === 'medication') {
    document.getElementById('medication-fields').style.display = 'block';
  }
}

// Open new entry modal
function openNewEntryModal() {
  isEditing = false;
  selectedEntryId = null;

  document.getElementById('modal-title').textContent = 'New Journal Entry';
  document.getElementById('entry-form').reset();
  document.getElementById('entry-date').value = getTodayFormatted();

  // Hide type-specific fields
  document.querySelectorAll('.type-fields').forEach(el => {
    el.style.display = 'none';
  });

  document.getElementById('entry-modal').classList.add('active');
}

// Edit entry
function editEntry(id) {
  const entry = allEntries.find(e => e.id === id);
  if (!entry) return;

  isEditing = true;
  selectedEntryId = id;

  document.getElementById('modal-title').textContent = 'Edit Journal Entry';
  document.getElementById('entry-id').value = entry.id;
  document.getElementById('entry-pet').value = entry.pet_id;
  document.getElementById('entry-type').value = entry.entry_type;
  document.getElementById('entry-date').value = formatDateForInput(entry.entry_date);
  document.getElementById('entry-title').value = entry.title || '';
  document.getElementById('entry-content').value = entry.content || '';

  // Show/populate type-specific fields
  updateTypeFields(entry.entry_type);

  if (entry.metadata) {
    if (entry.entry_type === 'weight' && entry.metadata.weight) {
      document.getElementById('weight-value').value = entry.metadata.weight;
    } else if (entry.entry_type === 'medication') {
      document.getElementById('medication-name').value = entry.metadata.medication_name || '';
      document.getElementById('medication-dose').value = entry.metadata.dosage || '';
    }
  }

  document.getElementById('entry-modal').classList.add('active');
}

// Close entry modal
function closeEntryModal() {
  document.getElementById('entry-modal').classList.remove('active');
  clearError('entry-form-error');
}

// Handle entry submit
async function handleEntrySubmit(e) {
  e.preventDefault();
  clearError('entry-form-error');

  const type = document.getElementById('entry-type').value;

  const entryData = {
    pet_id: document.getElementById('entry-pet').value,
    entry_type: type,
    entry_date: document.getElementById('entry-date').value,
    title: document.getElementById('entry-title').value || null,
    content: document.getElementById('entry-content').value || null,
    metadata: {}
  };

  // Add type-specific metadata
  if (type === 'weight') {
    const weight = document.getElementById('weight-value').value;
    if (weight) entryData.metadata.weight = parseFloat(weight);
  } else if (type === 'medication') {
    const medName = document.getElementById('medication-name').value;
    const medDose = document.getElementById('medication-dose').value;
    if (medName) entryData.metadata.medication_name = medName;
    if (medDose) entryData.metadata.dosage = medDose;
  }

  try {
    if (isEditing) {
      await journalApi.update(selectedEntryId, entryData);
    } else {
      await journalApi.create(entryData);
    }

    closeEntryModal();
    await loadEntries();
  } catch (error) {
    showError('entry-form-error', error.message);
  }
}

// Confirm delete
function confirmDelete(id) {
  selectedEntryId = id;
  document.getElementById('delete-modal').classList.add('active');
}

// Close delete modal
function closeDeleteModal() {
  document.getElementById('delete-modal').classList.remove('active');
}

// Handle delete
async function handleDelete() {
  try {
    await journalApi.delete(selectedEntryId);
    closeDeleteModal();
    await loadEntries();
  } catch (error) {
    alert('Failed to delete entry: ' + error.message);
  }
}

// Helper functions
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Initialize on page load
initJournalPage();
