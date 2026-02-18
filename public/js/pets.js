// Pets management page logic

let pets = [];
let selectedPetId = null;

// Initialize pets page
async function initPetsPage() {
  const session = await requireAuth();
  if (!session) return;

  await loadPets();
  initModals();
}

// Load pets
async function loadPets() {
  const grid = document.getElementById('pets-grid');

  try {
    const data = await petsApi.getAll();
    pets = data.pets || [];
    renderPets(pets);
  } catch (error) {
    console.error('Error loading pets:', error);
    grid.innerHTML = '<p class="empty-state">Failed to load pets. Please try again.</p>';
  }
}

// Render pets
function renderPets(pets) {
  const grid = document.getElementById('pets-grid');

  if (pets.length === 0) {
    grid.innerHTML = `
      <p class="empty-state">
        No pets added yet. <a href="/add-pet.html">Add your first pet</a>
      </p>
    `;
    return;
  }

  grid.innerHTML = pets.map(pet => {
    const hasConditions = pet.known_conditions?.length > 0;
    const hasMedications = pet.medications?.length > 0;
    const hasDetails = hasConditions || hasMedications;

    return `
    <div class="pet-card">
      <div class="pet-card-info">
        <div class="pet-icon">${pet.species === 'dog' ? '🐕' : '🐈'}</div>
        <h3>${escapeHtml(pet.name)}</h3>
        <p>${escapeHtml(pet.breed) || capitalize(pet.species)}</p>
        ${pet.age_years || pet.age_months ? `<p>${formatAge(pet.age_years, pet.age_months)}</p>` : ''}
        ${pet.weight_kg ? `<p>${pet.weight_kg} kg</p>` : ''}
      </div>

      <div class="pet-card-details">
        ${hasDetails ? `
          ${hasConditions ? `<p><strong>Conditions:</strong> ${pet.known_conditions.map(c => escapeHtml(c)).join(', ')}</p>` : ''}
          ${hasMedications ? `<p><strong>Medications:</strong> ${pet.medications.map(m => escapeHtml(m)).join(', ')}</p>` : ''}
        ` : `<p class="no-details">No conditions or medications</p>`}
      </div>

      <div class="pet-card-actions">
        <a href="/triage.html?pet=${pet.id}" class="btn btn-primary btn-small">Check Symptoms</a>
        <button class="btn btn-secondary btn-small" onclick="openEditModal('${pet.id}')">Edit</button>
        <button class="btn btn-secondary btn-small" onclick="openDeleteModal('${pet.id}')">Delete</button>
        <button class="btn btn-secondary btn-small" onclick="downloadPetSummary('${pet.id}')">Export PDF</button>
      </div>
    </div>
  `}).join('');
}

// Initialize modals
function initModals() {
  // Edit modal
  const editModal = document.getElementById('edit-pet-modal');
  const closeEditBtn = document.getElementById('close-modal');
  const cancelEditBtn = document.getElementById('cancel-edit');
  const editForm = document.getElementById('edit-pet-form');

  closeEditBtn?.addEventListener('click', closeEditModal);
  cancelEditBtn?.addEventListener('click', closeEditModal);
  editModal?.querySelector('.modal-overlay')?.addEventListener('click', closeEditModal);

  editForm?.addEventListener('submit', handleEditSubmit);

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

// Open edit modal
function openEditModal(petId) {
  const pet = pets.find(p => p.id === petId);
  if (!pet) return;

  selectedPetId = petId;

  document.getElementById('edit-pet-id').value = pet.id;
  document.getElementById('edit-name').value = pet.name;
  document.getElementById('edit-species').value = pet.species;
  document.getElementById('edit-breed').value = pet.breed || '';
  document.getElementById('edit-age-years').value = pet.age_years || '';
  document.getElementById('edit-age-months').value = pet.age_months || '';
  document.getElementById('edit-weight').value = pet.weight_kg || '';
  document.getElementById('edit-conditions').value = arrayToString(pet.known_conditions);
  document.getElementById('edit-medications').value = arrayToString(pet.medications);

  document.getElementById('edit-pet-modal').classList.add('active');
}

// Close edit modal
function closeEditModal() {
  document.getElementById('edit-pet-modal').classList.remove('active');
  clearError('edit-form-error');
}

// Handle edit submit
async function handleEditSubmit(e) {
  e.preventDefault();

  clearError('edit-form-error');

  const petData = {
    name: document.getElementById('edit-name').value,
    species: document.getElementById('edit-species').value,
    breed: document.getElementById('edit-breed').value || null,
    age_years: parseInt(document.getElementById('edit-age-years').value) || null,
    age_months: parseInt(document.getElementById('edit-age-months').value) || null,
    weight_kg: parseFloat(document.getElementById('edit-weight').value) || null,
    known_conditions: parseToArray(document.getElementById('edit-conditions').value),
    medications: parseToArray(document.getElementById('edit-medications').value)
  };

  try {
    await petsApi.update(selectedPetId, petData);
    closeEditModal();
    await loadPets();
  } catch (error) {
    showError('edit-form-error', error.message);
  }
}

// Open delete modal
function openDeleteModal(petId) {
  const pet = pets.find(p => p.id === petId);
  if (!pet) return;

  selectedPetId = petId;
  document.getElementById('delete-pet-name').textContent = pet.name;
  document.getElementById('delete-modal').classList.add('active');
}

// Close delete modal
function closeDeleteModal() {
  document.getElementById('delete-modal').classList.remove('active');
}

// Handle delete
async function handleDelete() {
  try {
    await petsApi.delete(selectedPetId);
    closeDeleteModal();
    await loadPets();
  } catch (error) {
    alert('Failed to delete pet: ' + error.message);
  }
}

// Download pet summary PDF
async function downloadPetSummary(petId) {
  try {
    const blob = await exportApi.petSummaryPdf(petId);
    const pet = pets.find(p => p.id === petId);
    downloadBlob(blob, `${pet?.name || 'pet'}-health-summary.pdf`);
  } catch (error) {
    alert('Failed to download PDF: ' + error.message);
  }
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
initPetsPage();
