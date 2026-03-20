// Journal page logic

let allEntries = [];
let pets = [];
let selectedEntryId = null;
let isEditing = false;
let journalPhotoData = null;

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
        ${entry.metadata?.photo_url ? `<div class="journal-photo-thumb"><img src="${entry.metadata.photo_url}" alt="Journal photo"></div>` : ''}
        ${renderMetadata(entry)}
      </div>
      <div class="journal-card-meta">
        <span>Added ${formatDate(entry.created_at, true)}</span>
        <div class="journal-card-actions">
          <button data-edit="${entry.id}" title="Edit">✏️</button>
          <button class="delete" data-delete="${entry.id}" title="Delete">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');

  // Attach event listeners (CSP blocks inline handlers)
  container.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => editEntry(btn.dataset.edit));
  });
  container.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => confirmDelete(btn.dataset.delete));
  });
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

  // Journal photo upload
  const journalPhotoArea = document.getElementById('journal-photo-area');
  const journalPhotoInput = document.getElementById('journal-photo-input');

  journalPhotoArea?.addEventListener('click', () => journalPhotoInput?.click());
  journalPhotoInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showError('entry-form-error', 'Photo must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      journalPhotoData = event.target.result;
      const preview = document.getElementById('journal-photo-preview');
      preview.innerHTML = `<img src="${journalPhotoData}" alt="Journal photo">`;
    };
    reader.readAsDataURL(file);
  });
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
  journalPhotoData = null;

  document.getElementById('modal-title').textContent = 'New Journal Entry';
  document.getElementById('entry-form').reset();
  document.getElementById('entry-date').value = getTodayFormatted();

  // Reset photo preview
  const preview = document.getElementById('journal-photo-preview');
  if (preview) {
    preview.innerHTML = '<span class="photo-placeholder">📷</span><span>Attach Photo</span>';
  }

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
  journalPhotoData = null;

  // Reset file input to avoid stale state
  const photoInput = document.getElementById('journal-photo-input');
  if (photoInput) photoInput.value = '';

  document.getElementById('modal-title').textContent = 'Edit Journal Entry';
  document.getElementById('entry-id').value = entry.id;
  document.getElementById('entry-pet').value = entry.pet_id;
  document.getElementById('entry-type').value = entry.entry_type;
  document.getElementById('entry-date').value = formatDateForInput(entry.entry_date);
  document.getElementById('entry-title').value = entry.title || '';
  document.getElementById('entry-content').value = entry.content || '';

  // Show existing photo if available
  const preview = document.getElementById('journal-photo-preview');
  if (entry.metadata?.photo_url) {
    preview.innerHTML = `<img src="${entry.metadata.photo_url}" alt="Journal photo">`;
  } else {
    preview.innerHTML = '<span class="photo-placeholder">📷</span><span>Attach Photo</span>';
  }

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
async function handleEntrySubmit(evt) {
  evt.preventDefault();
  clearError('entry-form-error');

  const type = document.getElementById('entry-type').value;

  // Preserve existing metadata when editing
  let existingMetadata = {};
  if (isEditing && selectedEntryId) {
    const existingEntry = allEntries.find(entry => entry.id === selectedEntryId);
    if (existingEntry?.metadata) {
      existingMetadata = { ...existingEntry.metadata };
    }
  }

  const entryData = {
    pet_id: document.getElementById('entry-pet').value,
    entry_type: type,
    entry_date: document.getElementById('entry-date').value,
    title: document.getElementById('entry-title').value || null,
    content: document.getElementById('entry-content').value || null,
    metadata: { ...existingMetadata }
  };

  // Add type-specific metadata
  if (type === 'weight') {
    const weight = document.getElementById('weight-value').value;
    if (weight) entryData.metadata.weight = parseFloat(weight);
    else delete entryData.metadata.weight;
  } else if (type === 'medication') {
    const medName = document.getElementById('medication-name').value;
    const medDose = document.getElementById('medication-dose').value;
    if (medName) entryData.metadata.medication_name = medName;
    if (medDose) entryData.metadata.dosage = medDose;
  }

  // Upload photo if selected
  if (journalPhotoData) {
    try {
      const uploadResult = await uploadApi.upload(journalPhotoData, `journal-${Date.now()}.jpg`);
      entryData.metadata.photo_url = uploadResult.url;
    } catch (uploadError) {
      console.error('Photo upload failed:', uploadError);
      // Continue without photo
    }
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
