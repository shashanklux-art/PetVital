// Mock data store for local development (no Supabase needed)

const crypto = require('crypto');

// Generate UUID
function uuid() {
  return crypto.randomUUID();
}

// In-memory data stores
const store = {
  users: new Map(),
  profiles: new Map(),
  pets: new Map(),
  triageHistory: new Map(),
  journalEntries: new Map(),
  sessions: new Map()
};

// Initialize with a demo user
const demoUserId = uuid();
const demoUser = {
  id: demoUserId,
  email: 'demo@petvital.app',
  password: 'demo123', // In real app, this would be hashed
  user_metadata: { full_name: 'Demo User' },
  created_at: new Date().toISOString()
};
store.users.set(demoUser.email, demoUser);
store.profiles.set(demoUserId, {
  id: demoUserId,
  email: demoUser.email,
  full_name: 'Demo User',
  preferred_language: 'en',
  created_at: new Date().toISOString()
});

// Add demo pets
const demoPets = [
  {
    id: uuid(),
    user_id: demoUserId,
    name: 'Max',
    species: 'dog',
    breed: 'Golden Retriever',
    age_years: 5,
    age_months: 3,
    weight_kg: 32,
    known_conditions: ['Hip dysplasia'],
    medications: ['Joint supplement'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: uuid(),
    user_id: demoUserId,
    name: 'Luna',
    species: 'cat',
    breed: 'Siamese',
    age_years: 3,
    age_months: 0,
    weight_kg: 4.5,
    known_conditions: [],
    medications: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

demoPets.forEach(pet => store.pets.set(pet.id, pet));

// Vet clinics data
const vetClinics = [
  { id: uuid(), name: 'City Emergency Vet', address: '123 Main Street', city: 'New York', state: 'NY', zip_code: '10001', phone: '(212) 555-0100', is_emergency: true, is_24_hour: true, rating: 4.8, review_count: 342, services: ['emergency', 'surgery', 'imaging', 'icu'], latitude: 40.7128, longitude: -74.0060 },
  { id: uuid(), name: 'Pawsome Pet Care', address: '456 Oak Avenue', city: 'New York', state: 'NY', zip_code: '10002', phone: '(212) 555-0101', is_emergency: false, is_24_hour: false, rating: 4.6, review_count: 215, services: ['general', 'vaccinations', 'dental', 'grooming'], latitude: 40.7150, longitude: -73.9990 },
  { id: uuid(), name: 'Downtown Animal Hospital', address: '789 Park Blvd', city: 'New York', state: 'NY', zip_code: '10003', phone: '(212) 555-0102', is_emergency: true, is_24_hour: false, rating: 4.5, review_count: 178, services: ['emergency', 'surgery', 'general', 'exotic'], latitude: 40.7200, longitude: -73.9950 },
  { id: uuid(), name: 'Happy Tails Clinic', address: '321 Elm Street', city: 'Brooklyn', state: 'NY', zip_code: '11201', phone: '(718) 555-0103', is_emergency: false, is_24_hour: false, rating: 4.7, review_count: 289, services: ['general', 'vaccinations', 'wellness', 'nutrition'], latitude: 40.6892, longitude: -73.9857 },
  { id: uuid(), name: '24 Hour Pet ER', address: '555 Emergency Lane', city: 'New York', state: 'NY', zip_code: '10004', phone: '(212) 555-0104', is_emergency: true, is_24_hour: true, rating: 4.4, review_count: 156, services: ['emergency', 'critical care', 'surgery', 'blood bank'], latitude: 40.7100, longitude: -74.0100 },
  { id: uuid(), name: 'Friendly Paws Veterinary', address: '888 Sunset Drive', city: 'Queens', state: 'NY', zip_code: '11375', phone: '(718) 555-0105', is_emergency: false, is_24_hour: false, rating: 4.9, review_count: 402, services: ['general', 'dental', 'vaccinations', 'behavioral'], latitude: 40.7210, longitude: -73.8450 }
];

// Mock authentication
const mockAuth = {
  async signUp({ email, password, options }) {
    if (store.users.has(email)) {
      return { data: null, error: { message: 'User already exists' } };
    }

    const userId = uuid();
    const user = {
      id: userId,
      email,
      password,
      user_metadata: options?.data || {},
      created_at: new Date().toISOString()
    };

    store.users.set(email, user);
    store.profiles.set(userId, {
      id: userId,
      email,
      full_name: options?.data?.full_name || '',
      preferred_language: 'en',
      created_at: new Date().toISOString()
    });

    const token = Buffer.from(JSON.stringify({ userId, email })).toString('base64');
    store.sessions.set(token, user);

    return {
      data: { user, session: { access_token: token } },
      error: null
    };
  },

  async signInWithPassword({ email, password }) {
    const user = store.users.get(email);
    if (!user || user.password !== password) {
      return { data: null, error: { message: 'Invalid login credentials' } };
    }

    const token = Buffer.from(JSON.stringify({ userId: user.id, email })).toString('base64');
    store.sessions.set(token, user);

    return {
      data: { user, session: { access_token: token } },
      error: null
    };
  },

  async getUser(token) {
    const user = store.sessions.get(token);
    if (!user) {
      return { data: { user: null }, error: { message: 'Invalid token' } };
    }
    return { data: { user }, error: null };
  },

  async signOut(token) {
    store.sessions.delete(token);
    return { error: null };
  }
};

// Mock database queries
const mockDb = {
  // Profiles
  profiles: {
    async select(userId) {
      return { data: store.profiles.get(userId), error: null };
    },
    async update(userId, data) {
      const profile = store.profiles.get(userId);
      if (!profile) return { data: null, error: { message: 'Profile not found' } };
      Object.assign(profile, data);
      return { data: profile, error: null };
    }
  },

  // Pets
  pets: {
    async getAll(userId) {
      const pets = Array.from(store.pets.values())
        .filter(p => p.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return { data: pets, error: null };
    },
    async get(id, userId) {
      const pet = store.pets.get(id);
      if (!pet || pet.user_id !== userId) {
        return { data: null, error: { message: 'Pet not found' } };
      }
      return { data: pet, error: null };
    },
    async create(petData) {
      const pet = {
        id: uuid(),
        ...petData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      store.pets.set(pet.id, pet);
      return { data: pet, error: null };
    },
    async update(id, userId, data) {
      const pet = store.pets.get(id);
      if (!pet || pet.user_id !== userId) {
        return { data: null, error: { message: 'Pet not found' } };
      }
      Object.assign(pet, data, { updated_at: new Date().toISOString() });
      return { data: pet, error: null };
    },
    async delete(id, userId) {
      const pet = store.pets.get(id);
      if (!pet || pet.user_id !== userId) {
        return { error: { message: 'Pet not found' } };
      }
      store.pets.delete(id);
      return { error: null };
    }
  },

  // Triage History
  triageHistory: {
    async getAll(userId, filters = {}) {
      let records = Array.from(store.triageHistory.values())
        .filter(r => r.user_id === userId);

      if (filters.pet_id) {
        records = records.filter(r => r.pet_id === filters.pet_id);
      }
      if (filters.urgency_level) {
        records = records.filter(r => r.urgency_level === filters.urgency_level);
      }

      records.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Add pet info
      records = records.map(r => ({
        ...r,
        pets: store.pets.get(r.pet_id)
      }));

      return { data: records.slice(0, filters.limit || 50), error: null };
    },
    async get(id, userId) {
      const record = store.triageHistory.get(id);
      if (!record || record.user_id !== userId) {
        return { data: null, error: { message: 'Record not found' } };
      }
      return {
        data: { ...record, pets: store.pets.get(record.pet_id) },
        error: null
      };
    },
    async create(data) {
      const record = {
        id: uuid(),
        ...data,
        created_at: new Date().toISOString()
      };
      store.triageHistory.set(record.id, record);
      return { data: record, error: null };
    }
  },

  // Journal Entries
  journalEntries: {
    async getAll(userId, filters = {}) {
      let entries = Array.from(store.journalEntries.values())
        .filter(e => e.user_id === userId);

      if (filters.pet_id) {
        entries = entries.filter(e => e.pet_id === filters.pet_id);
      }
      if (filters.entry_type) {
        entries = entries.filter(e => e.entry_type === filters.entry_type);
      }

      entries.sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date));

      // Add pet info
      entries = entries.map(e => ({
        ...e,
        pets: store.pets.get(e.pet_id)
      }));

      return { data: entries.slice(0, filters.limit || 50), error: null };
    },
    async get(id, userId) {
      const entry = store.journalEntries.get(id);
      if (!entry || entry.user_id !== userId) {
        return { data: null, error: { message: 'Entry not found' } };
      }
      return {
        data: { ...entry, pets: store.pets.get(entry.pet_id) },
        error: null
      };
    },
    async create(data) {
      const entry = {
        id: uuid(),
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      store.journalEntries.set(entry.id, entry);
      return { data: { ...entry, pets: store.pets.get(entry.pet_id) }, error: null };
    },
    async update(id, userId, data) {
      const entry = store.journalEntries.get(id);
      if (!entry || entry.user_id !== userId) {
        return { data: null, error: { message: 'Entry not found' } };
      }
      Object.assign(entry, data, { updated_at: new Date().toISOString() });
      return { data: { ...entry, pets: store.pets.get(entry.pet_id) }, error: null };
    },
    async delete(id, userId) {
      const entry = store.journalEntries.get(id);
      if (!entry || entry.user_id !== userId) {
        return { error: { message: 'Entry not found' } };
      }
      store.journalEntries.delete(id);
      return { error: null };
    }
  },

  // Vet Clinics
  vetClinics: {
    async getAll(filters = {}) {
      let clinics = [...vetClinics];

      if (filters.city) {
        clinics = clinics.filter(c =>
          c.city.toLowerCase().includes(filters.city.toLowerCase())
        );
      }
      if (filters.emergency_only === 'true') {
        clinics = clinics.filter(c => c.is_emergency);
      }
      if (filters.is_24_hour === 'true') {
        clinics = clinics.filter(c => c.is_24_hour);
      }

      clinics.sort((a, b) => b.rating - a.rating);
      return { data: clinics, error: null };
    },
    async get(id) {
      const clinic = vetClinics.find(c => c.id === id);
      if (!clinic) {
        return { data: null, error: { message: 'Clinic not found' } };
      }
      return { data: clinic, error: null };
    }
  }
};

module.exports = { mockAuth, mockDb, store };
