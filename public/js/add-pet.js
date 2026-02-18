// Add pet page logic

// Initialize add pet page
async function initAddPetPage() {
  const session = await requireAuth();
  if (!session) return;

  initForm();
}

// Initialize form
function initForm() {
  const form = document.getElementById('pet-form');

  form?.addEventListener('submit', handleSubmit);
}

// Handle form submit
async function handleSubmit(e) {
  e.preventDefault();

  const submitBtn = document.getElementById('submit-btn');
  clearError('form-error');
  setButtonLoading(submitBtn, true);

  const formData = new FormData(e.target);

  const petData = {
    name: formData.get('name'),
    species: formData.get('species'),
    breed: formData.get('breed') || null,
    age_years: parseInt(formData.get('age_years')) || null,
    age_months: parseInt(formData.get('age_months')) || null,
    weight_kg: parseFloat(formData.get('weight_kg')) || null,
    known_conditions: parseToArray(formData.get('known_conditions')),
    medications: parseToArray(formData.get('medications'))
  };

  try {
    await petsApi.create(petData);
    window.location.href = '/pets.html';
  } catch (error) {
    showError('form-error', error.message);
    setButtonLoading(submitBtn, false);
  }
}

// Initialize on page load
initAddPetPage();
