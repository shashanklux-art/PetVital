// Utility functions

// Format date for display
function formatDate(dateString, includeTime = false) {
  const date = new Date(dateString);
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  return date.toLocaleDateString('en-US', options);
}

// Format date for input fields
function formatDateForInput(dateString) {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

// Get today's date formatted
function getTodayFormatted() {
  return new Date().toISOString().split('T')[0];
}

// Show error message
function showError(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
  }
}

// Clear error message
function clearError(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = '';
    element.style.display = 'none';
  }
}

// Show loading state on button
function setButtonLoading(button, loading) {
  if (!button) return;

  const textSpan = button.querySelector('.btn-text');
  const loadingSpan = button.querySelector('.btn-loading');

  if (loading) {
    button.disabled = true;
    if (textSpan) textSpan.style.display = 'none';
    if (loadingSpan) loadingSpan.style.display = 'inline';
  } else {
    button.disabled = false;
    if (textSpan) textSpan.style.display = 'inline';
    if (loadingSpan) loadingSpan.style.display = 'none';
  }
}

// Parse comma-separated string to array
function parseToArray(str) {
  if (!str) return [];
  return str.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

// Array to comma-separated string
function arrayToString(arr) {
  if (!arr || arr.length === 0) return '';
  return arr.join(', ');
}

// Get URL parameter
function getUrlParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// Mobile menu toggle
function initMobileMenu() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileNav = document.getElementById('mobile-nav');

  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', () => {
      mobileNav.classList.toggle('active');
    });
  }
}

// Initialize mobile menu on page load
document.addEventListener('DOMContentLoaded', initMobileMenu);

// Urgency level labels
const URGENCY_LABELS = {
  emergency: 'EMERGENCY - Go to vet NOW',
  urgent: 'URGENT - See vet within 24 hours',
  soon: 'SOON - Schedule within 2-3 days',
  monitor: 'MONITOR - Watch at home'
};

// Entry type labels
const ENTRY_TYPE_LABELS = {
  note: 'General Note',
  symptom: 'Symptom',
  medication: 'Medication',
  vet_visit: 'Vet Visit',
  weight: 'Weight',
  food: 'Food',
  behavior: 'Behavior'
};

// Symptom categories and symptoms
const SYMPTOMS = {
  dog: {
    'Digestive': [
      'Vomiting',
      'Diarrhea',
      'Not eating',
      'Eating less than usual',
      'Drinking more water',
      'Drinking less water',
      'Bloated stomach',
      'Constipation'
    ],
    'Respiratory': [
      'Coughing',
      'Sneezing',
      'Difficulty breathing',
      'Rapid breathing',
      'Wheezing',
      'Nasal discharge'
    ],
    'Mobility': [
      'Limping',
      'Difficulty walking',
      'Not wanting to move',
      'Stiffness',
      'Swelling in legs or joints',
      'Unable to stand'
    ],
    'Behavior': [
      'Lethargy',
      'Restlessness',
      'Hiding',
      'Aggression',
      'Confusion',
      'Excessive panting',
      'Whining or crying'
    ],
    'Skin & Coat': [
      'Scratching excessively',
      'Hair loss',
      'Redness or rash',
      'Lumps or bumps',
      'Hot spots',
      'Dry or flaky skin'
    ],
    'Eyes & Ears': [
      'Red eyes',
      'Eye discharge',
      'Squinting',
      'Ear scratching',
      'Head shaking',
      'Ear odor or discharge'
    ],
    'Urinary': [
      'Straining to urinate',
      'Blood in urine',
      'Frequent urination',
      'Accidents in house',
      'Unable to urinate'
    ],
    'Emergency Signs': [
      'Collapse',
      'Seizures',
      'Severe bleeding',
      'Pale gums',
      'Blue tongue or gums',
      'Unconscious'
    ],
    'Dental/Oral': [
      'Bad breath',
      'Excessive drooling',
      'Difficulty chewing',
      'Bleeding gums',
      'Loose teeth',
      'Pawing at mouth',
      'Swollen face/jaw'
    ],
    'Pain': [
      'Crying when touched',
      'Guarding body part',
      'Trembling/shaking',
      'Reluctance to be picked up',
      'Arched back',
      'Grinding teeth'
    ],
    'Weight Changes': [
      'Unexplained weight loss',
      'Rapid weight gain',
      'Visible ribs/spine',
      'Pot-bellied appearance'
    ],
    'Reproductive': [
      'Vaginal swelling/discharge',
      'Testicular enlargement',
      'Swollen mammary glands',
      'Unusual nipple discharge'
    ]
  },
  cat: {
    'Digestive': [
      'Vomiting',
      'Diarrhea',
      'Not eating',
      'Eating less than usual',
      'Drinking more water',
      'Drinking less water',
      'Constipation',
      'Hairballs (excessive)'
    ],
    'Respiratory': [
      'Sneezing',
      'Coughing',
      'Difficulty breathing',
      'Rapid breathing',
      'Open-mouth breathing',
      'Nasal discharge'
    ],
    'Mobility': [
      'Limping',
      'Difficulty jumping',
      'Not wanting to move',
      'Stiffness',
      'Swelling',
      'Unable to walk'
    ],
    'Behavior': [
      'Lethargy',
      'Hiding more than usual',
      'Aggression',
      'Excessive vocalization',
      'Not grooming',
      'Over-grooming'
    ],
    'Skin & Coat': [
      'Scratching excessively',
      'Hair loss',
      'Redness or rash',
      'Lumps or bumps',
      'Matted fur',
      'Bald patches'
    ],
    'Eyes & Ears': [
      'Red eyes',
      'Eye discharge',
      'Squinting',
      'Third eyelid showing',
      'Ear scratching',
      'Head tilting'
    ],
    'Urinary': [
      'Straining to urinate',
      'Blood in urine',
      'Urinating outside litter box',
      'Frequent trips to litter box',
      'Unable to urinate'
    ],
    'Emergency Signs': [
      'Collapse',
      'Seizures',
      'Severe bleeding',
      'Pale gums',
      'Difficulty breathing',
      'Unconscious'
    ],
    'Dental/Oral': [
      'Bad breath',
      'Excessive drooling',
      'Difficulty chewing',
      'Bleeding gums',
      'Loose teeth',
      'Pawing at mouth',
      'Swollen face/jaw'
    ],
    'Pain': [
      'Crying when touched',
      'Guarding body part',
      'Trembling/shaking',
      'Reluctance to be picked up',
      'Arched back',
      'Grinding teeth'
    ],
    'Weight Changes': [
      'Unexplained weight loss',
      'Rapid weight gain',
      'Visible ribs/spine',
      'Pot-bellied appearance'
    ],
    'Reproductive': [
      'Vaginal swelling/discharge',
      'Testicular enlargement',
      'Swollen mammary glands',
      'Unusual nipple discharge'
    ]
  }
};
