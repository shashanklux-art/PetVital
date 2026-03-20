// Add pet page logic

let petPhotoData = null;

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

  // Toggle additional details section
  const toggleBtn = document.getElementById('toggle-details');
  const detailsContent = document.getElementById('additional-details');
  const toggleIcon = toggleBtn?.querySelector('.toggle-icon');

  toggleBtn?.addEventListener('click', () => {
    const isOpen = detailsContent.style.display !== 'none';
    detailsContent.style.display = isOpen ? 'none' : 'flex';
    toggleIcon?.classList.toggle('open', !isOpen);
  });

  // Photo upload
  const photoArea = document.getElementById('photo-upload-area');
  const photoInput = document.getElementById('photo-input');

  photoArea?.addEventListener('click', () => photoInput?.click());
  photoInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showError('form-error', 'Photo must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      petPhotoData = event.target.result;
      const preview = document.getElementById('photo-preview');
      preview.innerHTML = `<img src="${petPhotoData}" alt="Pet photo">`;
    };
    reader.readAsDataURL(file);
  });
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
    medications: parseToArray(formData.get('medications')),
    diet: formData.get('diet') || null,
    is_fixed: formData.get('is_fixed') || 'unknown',
    last_vet_visit: formData.get('last_vet_visit') || null,
    recent_vaccines: formData.get('recent_vaccines') || null,
    indoor_outdoor: formData.get('indoor_outdoor') || 'indoor',
    supplements: formData.get('supplements') || null,
    travel_history: formData.get('travel_history') || null,
    recent_procedures: formData.get('recent_procedures') || null
  };

  try {
    // Upload photo if selected
    if (petPhotoData) {
      try {
        const uploadResult = await uploadApi.upload(petPhotoData, `pet-${petData.name}.jpg`);
        petData.photo_url = uploadResult.url;
      } catch (uploadError) {
        console.error('Photo upload failed:', uploadError);
        // Continue without photo
      }
    }

    await petsApi.create(petData);
    window.location.href = '/pets.html';
  } catch (error) {
    showError('form-error', error.message);
    setButtonLoading(submitBtn, false);
  }
}

// Initialize on page load
initAddPetPage();
