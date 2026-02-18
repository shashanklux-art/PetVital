// History page logic

let allHistory = [];
let pets = [];

// Initialize history page
async function initHistoryPage() {
  const session = await requireAuth();
  if (!session) return;

  await Promise.all([
    loadPets(),
    loadHistory()
  ]);

  initFilters();
  initModal();
}

// Load pets for filter
async function loadPets() {
  try {
    const data = await petsApi.getAll();
    pets = data.pets || [];
    populatePetFilter();
  } catch (error) {
    console.error('Error loading pets:', error);
  }
}

// Populate pet filter dropdown
function populatePetFilter() {
  const select = document.getElementById('filter-pet');
  pets.forEach(pet => {
    const option = document.createElement('option');
    option.value = pet.id;
    option.textContent = pet.name;
    select.appendChild(option);
  });
}

// Load history
async function loadHistory() {
  const container = document.getElementById('history-list');

  try {
    const data = await triageApi.getHistory();
    allHistory = data.history || [];
    renderHistory(allHistory);
  } catch (error) {
    console.error('Error loading history:', error);
    container.innerHTML = '<p class="empty-state">Failed to load history.</p>';
  }
}

// Render history list
function renderHistory(history) {
  const container = document.getElementById('history-list');

  if (history.length === 0) {
    container.innerHTML = `
      <p class="empty-state">
        No symptom checks found. <a href="/triage.html">Do your first check</a>
      </p>
    `;
    return;
  }

  container.innerHTML = history.map(item => {
    const response = JSON.parse(item.ai_response);
    const date = formatDate(item.created_at, true);

    return `
      <div class="history-card" onclick="showHistoryDetail('${item.id}')">
        <div class="history-card-header">
          <span class="urgency-badge urgency-${item.urgency_level}">${item.urgency_level}</span>
          <span class="history-date">${date}</span>
        </div>
        <div class="history-card-body">
          <h3>${escapeHtml(item.pets?.name || 'Pet')}</h3>
          <p class="symptoms-preview">${item.symptoms.slice(0, 4).map(s => escapeHtml(s)).join(', ')}${item.symptoms.length > 4 ? '...' : ''}</p>
          <p class="summary-preview">${escapeHtml(response.summary)}</p>
        </div>
      </div>
    `;
  }).join('');
}

// Initialize filters
function initFilters() {
  document.getElementById('filter-pet')?.addEventListener('change', applyFilters);
  document.getElementById('filter-urgency')?.addEventListener('change', applyFilters);
}

// Apply filters
function applyFilters() {
  const petFilter = document.getElementById('filter-pet').value;
  const urgencyFilter = document.getElementById('filter-urgency').value;

  let filtered = allHistory;

  if (petFilter) {
    filtered = filtered.filter(h => h.pet_id === petFilter);
  }

  if (urgencyFilter) {
    filtered = filtered.filter(h => h.urgency_level === urgencyFilter);
  }

  renderHistory(filtered);
}

// Initialize modal
function initModal() {
  const modal = document.getElementById('history-modal');
  const closeBtn = document.getElementById('close-modal');

  closeBtn?.addEventListener('click', closeModal);
  modal?.querySelector('.modal-overlay')?.addEventListener('click', closeModal);
}

// Show history detail
function showHistoryDetail(id) {
  const item = allHistory.find(h => h.id === id);
  if (!item) return;

  const response = JSON.parse(item.ai_response);
  const container = document.getElementById('history-detail');

  const urgencyLabels = {
    emergency: 'EMERGENCY - Go to vet NOW',
    urgent: 'URGENT - See vet within 24 hours',
    soon: 'SOON - Schedule within 2-3 days',
    monitor: 'MONITOR - Watch at home'
  };

  container.innerHTML = `
    <div class="urgency-badge urgency-${item.urgency_level}" style="display: block; text-align: center; padding: var(--spacing-md); margin-bottom: var(--spacing-lg);">
      ${urgencyLabels[item.urgency_level]}
    </div>

    <div class="result-section">
      <p><strong>Pet:</strong> ${escapeHtml(item.pets?.name || 'Unknown')}</p>
      <p><strong>Date:</strong> ${formatDate(item.created_at, true)}</p>
    </div>

    <div class="result-section">
      <h4>Summary</h4>
      <p>${escapeHtml(response.summary)}</p>
    </div>

    <div class="result-section">
      <h4>Symptoms Reported</h4>
      <ul>
        ${item.symptoms.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
      </ul>
      ${item.additional_notes ? `<p><strong>Notes:</strong> ${escapeHtml(item.additional_notes)}</p>` : ''}
    </div>

    <div class="result-section">
      <h4>Assessment Reasoning</h4>
      <p>${escapeHtml(response.reasoning)}</p>
    </div>

    ${response.possible_conditions?.length ? `
      <div class="result-section">
        <h4>Possible Conditions</h4>
        <ul>
          ${response.possible_conditions.map(c => `<li>${escapeHtml(c)}</li>`).join('')}
        </ul>
      </div>
    ` : ''}

    ${response.immediate_actions?.length ? `
      <div class="result-section">
        <h4>Recommended Actions</h4>
        <ul>
          ${response.immediate_actions.map(a => `<li>${escapeHtml(a)}</li>`).join('')}
        </ul>
      </div>
    ` : ''}

    ${response.warning_signs?.length ? `
      <div class="result-section">
        <h4>Warning Signs</h4>
        <ul>
          ${response.warning_signs.map(w => `<li>${escapeHtml(w)}</li>`).join('')}
        </ul>
      </div>
    ` : ''}

    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Close</button>
      <button class="btn btn-primary" onclick="downloadTriagePdf('${item.id}')">Download PDF</button>
    </div>
  `;

  document.getElementById('history-modal').classList.add('active');
}

// Close modal
function closeModal() {
  document.getElementById('history-modal').classList.remove('active');
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

// Helper functions
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Initialize on page load
initHistoryPage();
