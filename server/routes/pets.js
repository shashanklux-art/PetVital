const express = require('express');
const router = express.Router();
const { mockDb } = require('../lib/mockStore');
const { getDb } = require('../lib/db');
const authMiddleware = require('../middleware/auth');

function isLocalMode() {
  return process.env.LOCAL_MODE === 'true';
}

// Get all pets for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (isLocalMode()) {
      const { data: pets, error } = await mockDb.pets.getAll(req.user.id);
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ pets });
    }

    const sql = getDb();
    const pets = await sql`
      SELECT * FROM pets
      WHERE user_id = ${req.user.id}
      ORDER BY created_at DESC
    `;
    res.json({ pets });
  } catch (error) {
    console.error('Pets fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch pets' });
  }
});

// Get single pet
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    if (isLocalMode()) {
      const { data: pet, error } = await mockDb.pets.get(req.params.id, req.user.id);
      if (error || !pet) return res.status(404).json({ error: 'Pet not found' });
      return res.json({ pet });
    }

    const sql = getDb();
    const [pet] = await sql`
      SELECT * FROM pets
      WHERE id = ${req.params.id} AND user_id = ${req.user.id}
    `;
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    res.json({ pet });
  } catch (error) {
    console.error('Pet fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch pet' });
  }
});

// Create new pet
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, species, breed, age_years, age_months, weight_kg, known_conditions, medications, diet, is_fixed, last_vet_visit, recent_vaccines, indoor_outdoor, supplements, travel_history, recent_procedures, photo_url } = req.body;

    if (!name || !species) {
      return res.status(400).json({ error: 'Name and species are required' });
    }
    if (!['dog', 'cat'].includes(species)) {
      return res.status(400).json({ error: 'Species must be dog or cat' });
    }

    const petData = {
      user_id: req.user.id,
      name, species, breed, age_years, age_months, weight_kg,
      known_conditions: known_conditions || [],
      medications: medications || [],
      diet: diet || null,
      is_fixed: is_fixed || 'unknown',
      last_vet_visit: last_vet_visit || null,
      recent_vaccines: recent_vaccines || null,
      indoor_outdoor: indoor_outdoor || 'indoor',
      supplements: supplements || null,
      travel_history: travel_history || null,
      recent_procedures: recent_procedures || null,
      photo_url: photo_url || null
    };

    if (isLocalMode()) {
      const { data: pet, error } = await mockDb.pets.create(petData);
      if (error) return res.status(400).json({ error: error.message });
      return res.status(201).json({ pet });
    }

    const sql = getDb();
    const [pet] = await sql`
      INSERT INTO pets (user_id, name, species, breed, age_years, age_months, weight_kg, known_conditions, medications, diet, is_fixed, last_vet_visit, recent_vaccines, indoor_outdoor, supplements, travel_history, recent_procedures, photo_url)
      VALUES (${req.user.id}, ${name}, ${species}, ${breed || null}, ${age_years || null}, ${age_months || null}, ${weight_kg || null}, ${petData.known_conditions}, ${petData.medications}, ${petData.diet}, ${petData.is_fixed}, ${petData.last_vet_visit}, ${petData.recent_vaccines}, ${petData.indoor_outdoor}, ${petData.supplements}, ${petData.travel_history}, ${petData.recent_procedures}, ${petData.photo_url})
      RETURNING *
    `;
    res.status(201).json({ pet });
  } catch (error) {
    console.error('Pet create error:', error);
    res.status(500).json({ error: 'Failed to create pet' });
  }
});

// Update pet
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, species, breed, age_years, age_months, weight_kg, known_conditions, medications, diet, is_fixed, last_vet_visit, recent_vaccines, indoor_outdoor, supplements, travel_history, recent_procedures, photo_url } = req.body;

    if (isLocalMode()) {
      const { data: pet, error } = await mockDb.pets.update(req.params.id, req.user.id, {
        name, species, breed, age_years, age_months, weight_kg, known_conditions, medications, diet, is_fixed, last_vet_visit, recent_vaccines, indoor_outdoor, supplements, travel_history, recent_procedures, photo_url
      });
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ pet });
    }

    const sql = getDb();
    const [pet] = await sql`
      UPDATE pets
      SET name = COALESCE(${name || null}, name),
          species = COALESCE(${species || null}, species),
          breed = ${breed !== undefined ? breed : null},
          age_years = ${age_years !== undefined ? age_years : null},
          age_months = ${age_months !== undefined ? age_months : null},
          weight_kg = ${weight_kg !== undefined ? weight_kg : null},
          known_conditions = COALESCE(${known_conditions || null}, known_conditions),
          medications = COALESCE(${medications || null}, medications),
          diet = ${diet !== undefined ? diet : null},
          is_fixed = ${is_fixed !== undefined ? is_fixed : null},
          last_vet_visit = ${last_vet_visit !== undefined ? last_vet_visit : null},
          recent_vaccines = ${recent_vaccines !== undefined ? recent_vaccines : null},
          indoor_outdoor = ${indoor_outdoor !== undefined ? indoor_outdoor : null},
          supplements = ${supplements !== undefined ? supplements : null},
          travel_history = ${travel_history !== undefined ? travel_history : null},
          recent_procedures = ${recent_procedures !== undefined ? recent_procedures : null},
          photo_url = ${photo_url !== undefined ? photo_url : null},
          updated_at = NOW()
      WHERE id = ${req.params.id} AND user_id = ${req.user.id}
      RETURNING *
    `;
    if (!pet) return res.status(400).json({ error: 'Pet not found' });
    res.json({ pet });
  } catch (error) {
    console.error('Pet update error:', error);
    res.status(500).json({ error: 'Failed to update pet' });
  }
});

// Delete pet
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (isLocalMode()) {
      const { error } = await mockDb.pets.delete(req.params.id, req.user.id);
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ message: 'Pet deleted successfully' });
    }

    const sql = getDb();
    await sql`DELETE FROM pets WHERE id = ${req.params.id} AND user_id = ${req.user.id}`;
    res.json({ message: 'Pet deleted successfully' });
  } catch (error) {
    console.error('Pet delete error:', error);
    res.status(500).json({ error: 'Failed to delete pet' });
  }
});

module.exports = router;
