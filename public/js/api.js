// API helper functions

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('auth_token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.href = '/login.html';
    return;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// API methods

// Pets
const petsApi = {
  getAll: () => apiRequest('/pets'),
  get: (id) => apiRequest(`/pets/${id}`),
  create: (petData) => apiRequest('/pets', {
    method: 'POST',
    body: JSON.stringify(petData)
  }),
  update: (id, petData) => apiRequest(`/pets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(petData)
  }),
  delete: (id) => apiRequest(`/pets/${id}`, {
    method: 'DELETE'
  })
};

// Triage
const triageApi = {
  submit: (triageData) => apiRequest('/triage', {
    method: 'POST',
    body: JSON.stringify(triageData)
  }),
  getHistory: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return apiRequest(`/triage/history${params ? '?' + params : ''}`);
  },
  getRecord: (id) => apiRequest(`/triage/history/${id}`)
};

// Journal
const journalApi = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return apiRequest(`/journal${params ? '?' + params : ''}`);
  },
  get: (id) => apiRequest(`/journal/${id}`),
  create: (entryData) => apiRequest('/journal', {
    method: 'POST',
    body: JSON.stringify(entryData)
  }),
  update: (id, entryData) => apiRequest(`/journal/${id}`, {
    method: 'PUT',
    body: JSON.stringify(entryData)
  }),
  delete: (id) => apiRequest(`/journal/${id}`, {
    method: 'DELETE'
  })
};

// Vets (public endpoint)
const vetsApi = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await fetch(`${CONFIG.API_BASE_URL}/vets${params ? '?' + params : ''}`);
    return response.json();
  }
};

// Export PDF
const exportApi = {
  triagePdf: async (id) => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${CONFIG.API_BASE_URL}/export/triage/${id}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    return response.blob();
  },
  petSummaryPdf: async (petId) => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${CONFIG.API_BASE_URL}/export/pet/${petId}/summary`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    return response.blob();
  }
};

// Upload
const uploadApi = {
  upload: (imageData, filename) => apiRequest('/upload', {
    method: 'POST',
    body: JSON.stringify({ image: imageData, filename })
  })
};

// Chat (placeholder for Workstream D)
const chatApi = {
  send: (message, history) => apiRequest('/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history })
  })
};

// Download blob as file
function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
