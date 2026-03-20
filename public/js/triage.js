// Triage page logic

let pets = [];
let selectedPet = null;
let selectedSymptoms = [];
let currentStep = 1;

// Initialize triage page
async function initTriagePage() {
  const session = await requireAuth();
  if (!session) return;

  await loadPets();
  initStepNavigation();

  // Check for pre-selected pet from URL
  const petId = getUrlParam('pet');
  if (petId) {
    const pet = pets.find(p => p.id === petId);
    if (pet) {
      selectPet(pet);
    }
  }
}

// Load pets
async function loadPets() {
  const container = document.getElementById('pet-select');
  const noPets = document.getElementById('no-pets');

  try {
    const data = await petsApi.getAll();
    pets = data.pets || [];

    if (pets.length === 0) {
      container.innerHTML = '';
      noPets.style.display = 'block';
      return;
    }

    container.innerHTML = pets.map(pet => `
      <label class="pet-select-option">
        <input type="radio" name="pet" value="${pet.id}">
        <div class="pet-select-card">
          <div class="pet-icon">${pet.photo_url ? `<img src="${pet.photo_url}" alt="${escapeHtml(pet.name)}" class="pet-avatar-img-sm">` : (pet.species === 'dog' ? '🐕' : '🐈')}</div>
          <div>${escapeHtml(pet.name)}</div>
        </div>
      </label>
    `).join('');

    // Add change listeners
    container.querySelectorAll('input[name="pet"]').forEach(input => {
      input.addEventListener('change', () => {
        const pet = pets.find(p => p.id === input.value);
        if (pet) selectPet(pet);
      });
    });
  } catch (error) {
    console.error('Error loading pets:', error);
    container.innerHTML = '<p class="empty-state">Failed to load pets.</p>';
  }
}

// Select a pet
function selectPet(pet) {
  selectedPet = pet;
  document.getElementById('next-step-1').disabled = false;

  // Check the radio button
  const radio = document.querySelector(`input[name="pet"][value="${pet.id}"]`);
  if (radio) radio.checked = true;
}

// Initialize step navigation
function initStepNavigation() {
  document.getElementById('next-step-1')?.addEventListener('click', () => {
    if (selectedPet) {
      goToStep(2);
      loadSymptoms();
    }
  });

  document.getElementById('prev-step-2')?.addEventListener('click', () => {
    goToStep(1);
  });

  document.getElementById('submit-triage')?.addEventListener('click', submitTriage);

  // Disclaimer checkbox
  document.getElementById('disclaimer-agree')?.addEventListener('change', (e) => {
    updateSubmitButton();
  });

  document.getElementById('free-text')?.addEventListener('input', () => {
    updateSubmitButton();
  });
}

// Go to step
function goToStep(step) {
  currentStep = step;

  // Update progress
  document.querySelectorAll('.progress-step').forEach(el => {
    const stepNum = parseInt(el.dataset.step);
    el.classList.remove('active', 'completed');
    if (stepNum < step) el.classList.add('completed');
    if (stepNum === step) el.classList.add('active');
  });

  // Show/hide steps
  document.getElementById('step-1').style.display = step === 1 ? 'block' : 'none';
  document.getElementById('step-2').style.display = step === 2 ? 'block' : 'none';
  document.getElementById('step-3').style.display = step === 3 ? 'block' : 'none';

  // Update pet name display
  if (step === 2 && selectedPet) {
    document.getElementById('pet-name-display').textContent = selectedPet.name;
  }
}

// Load symptoms based on species
function loadSymptoms() {
  const container = document.getElementById('symptoms-categories');
  const species = selectedPet.species;
  const symptoms = SYMPTOMS[species] || SYMPTOMS.dog;

  container.innerHTML = Object.entries(symptoms).map(([category, symptomList]) => `
    <div class="symptom-category">
      <h4>${category}</h4>
      <div class="symptoms-checklist">
        ${symptomList.map(symptom => `
          <label class="symptom-checkbox">
            <input type="checkbox" value="${escapeHtml(symptom)}">
            <span>${escapeHtml(symptom)}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `).join('');

  // Add change listeners
  container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      updateSelectedSymptoms();
    });
  });
}

// Update selected symptoms
function updateSelectedSymptoms() {
  const checkboxes = document.querySelectorAll('#symptoms-categories input[type="checkbox"]:checked');
  selectedSymptoms = Array.from(checkboxes).map(cb => cb.value);

  // Update count and tags
  document.getElementById('symptom-count').textContent = selectedSymptoms.length;
  document.getElementById('symptom-tags').innerHTML = selectedSymptoms.map(s =>
    `<span class="symptom-tag">${escapeHtml(s)}</span>`
  ).join('');

  // Update checkbox styling
  document.querySelectorAll('.symptom-checkbox').forEach(label => {
    const checkbox = label.querySelector('input');
    label.classList.toggle('selected', checkbox.checked);
  });

  updateSubmitButton();
}

// Update submit button state
function updateSubmitButton() {
  const disclaimerChecked = document.getElementById('disclaimer-agree').checked;
  const hasSymptoms = selectedSymptoms.length > 0;
  const hasFreeText = document.getElementById('free-text').value.trim().length > 0;
  document.getElementById('submit-triage').disabled = !(disclaimerChecked && (hasSymptoms || hasFreeText));
}

// Submit triage
async function submitTriage() {
  const submitBtn = document.getElementById('submit-triage');
  const loadingEl = document.getElementById('loading');
  const step2El = document.getElementById('step-2');

  step2El.style.display = 'none';
  loadingEl.style.display = 'block';

  try {
    const triageData = {
      pet_id: selectedPet.id,
      symptoms: selectedSymptoms,
      duration: document.getElementById('duration').value,
      severity: document.getElementById('severity').value,
      notes: document.getElementById('notes').value,
      free_text: document.getElementById('free-text').value.trim()
    };

    const response = await triageApi.submit(triageData);

    loadingEl.style.display = 'none';
    goToStep(3);
    renderResults(response.result, response.triage_id);

  } catch (error) {
    console.error('Triage error:', error);
    loadingEl.style.display = 'none';
    step2El.style.display = 'block';
    alert('Failed to process triage request. Please try again.');
  }
}

// Render results
function renderResults(result, triageId) {
  const container = document.getElementById('triage-result');

  const urgencyLabels = {
    emergency: 'EMERGENCY - Go to vet NOW',
    urgent: 'URGENT - See vet within 24 hours',
    soon: 'SOON - Schedule within 2-3 days',
    monitor: 'MONITOR - Watch at home'
  };

  container.innerHTML = `
    <div class="result-card">
      <div class="urgency-badge urgency-${result.urgency_level}">
        ${urgencyLabels[result.urgency_level]}
      </div>

      <div class="result-section">
        <h3>Assessment for ${escapeHtml(selectedPet.name)}</h3>
        <p class="result-summary">${escapeHtml(result.summary)}</p>
      </div>

      <div class="result-section">
        <h4>Why this rating</h4>
        <p>${escapeHtml(result.reasoning)}</p>
      </div>

      ${result.possible_conditions?.length ? `
        <div class="result-section">
          <h4>Possible Conditions</h4>
          <p class="result-note">These are possibilities, not diagnoses. Only a vet can diagnose.</p>
          <ul>
            ${result.possible_conditions.map(c => `<li>${escapeHtml(c)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div class="result-section">
        <h4>Immediate Actions</h4>
        <ul>
          ${(result.immediate_actions || []).map(a => `<li>${escapeHtml(a)}</li>`).join('')}
        </ul>
      </div>

      ${result.home_care?.length ? `
        <div class="result-section home-care-section">
          <h4>Home Care & Remedies</h4>
          <p class="result-note">Safe supportive care while you arrange veterinary attention:</p>
          <ul>
            ${result.home_care.map(h => `<li>${escapeHtml(h)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${result.nutrition_hydration?.length ? `
        <div class="result-section">
          <h4>Food & Water Guidance</h4>
          <ul>
            ${result.nutrition_hydration.map(n => `<li>${escapeHtml(n)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${result.comfort_measures?.length ? `
        <div class="result-section">
          <h4>Keeping ${escapeHtml(selectedPet.name)} Comfortable</h4>
          <ul>
            ${result.comfort_measures.map(c => `<li>${escapeHtml(c)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div class="result-section warning-section">
        <h4>Warning Signs - Seek Emergency Care If:</h4>
        <ul class="warning-list">
          ${(result.warning_signs || []).map(w => `<li>${escapeHtml(w)}</li>`).join('')}
        </ul>
      </div>

      ${result.what_to_tell_vet?.length ? `
        <div class="result-section">
          <h4>What to Tell Your Vet</h4>
          <p class="result-note">Important observations to share at your appointment:</p>
          <ul>
            ${result.what_to_tell_vet.map(t => `<li>${escapeHtml(t)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${result.expected_timeline ? `
        <div class="result-section">
          <h4>What to Expect</h4>
          <p>${escapeHtml(result.expected_timeline)}</p>
        </div>
      ` : ''}

      ${result.urgency_level === 'emergency' || result.urgency_level === 'urgent' ? `
        <div class="result-actions">
          <a href="/vets.html" class="btn btn-danger btn-full">
            Find a Vet Near You
          </a>
        </div>
      ` : ''}

      <div class="result-disclaimer">
        <strong>Important:</strong> This is not veterinary medical advice. Home care suggestions are supportive measures only and do not replace professional veterinary care. Always consult a qualified veterinarian for proper diagnosis and treatment.
      </div>

      <div class="result-footer">
        <a href="/dashboard.html" class="btn btn-secondary">Back to Dashboard</a>
        ${triageId ? `<button class="btn btn-secondary" id="download-pdf-btn" data-triage-id="${triageId}">Download PDF</button>` : ''}
        <button class="btn btn-primary" id="new-check-btn">New Check</button>
      </div>
    </div>
  `;

  // Attach event listeners
  document.getElementById('new-check-btn')?.addEventListener('click', startNewCheck);

  const downloadBtn = document.getElementById('download-pdf-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      downloadTriagePdf(downloadBtn.dataset.triageId);
    });
  }
}

// Download triage PDF
async function downloadTriagePdf(triageId) {
  try {
    const blob = await exportApi.triagePdf(triageId);
    downloadBlob(blob, `triage-report-${triageId}.pdf`);
  } catch (error) {
    alert('Failed to download PDF: ' + error.message);
  }
}

// Start new check
function startNewCheck() {
  selectedPet = null;
  selectedSymptoms = [];
  currentStep = 1;

  // Reset form
  document.querySelectorAll('#symptoms-categories input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
  });
  document.querySelectorAll('.symptom-checkbox').forEach(el => {
    el.classList.remove('selected');
  });
  document.getElementById('symptom-count').textContent = '0';
  document.getElementById('symptom-tags').innerHTML = '';
  document.getElementById('duration').value = 'just_started';
  document.getElementById('severity').value = 'mild';
  document.getElementById('notes').value = '';
  document.getElementById('free-text').value = '';
  document.getElementById('disclaimer-agree').checked = false;

  // Reset pet selection
  document.querySelectorAll('input[name="pet"]').forEach(radio => {
    radio.checked = false;
  });
  document.getElementById('next-step-1').disabled = true;

  goToStep(1);
}

// Helper functions
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Initialize on page load
initTriagePage();
