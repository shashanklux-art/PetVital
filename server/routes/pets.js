const express = require('express');
const router = express.Router();
const { mockDb } = require('../lib/mockStore');
const authMiddleware = require('../middleware/auth');

// Evaluate at runtime to ensure dotenv has loaded
function isLocalMode() {
  return process.env.LOCAL_MODE === 'true';
}

// Get all pets for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (isLocalMode()) {
      const { data: pets, error } = await mockDb.pets.getAll(req.user.id);
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      res.json({ pets });
    } else {
      const { supabase } = require('../lib/supabase');
      const { data: pets, error } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      res.json({ pets });
    }
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
      if (error || !pet) {
        return res.status(404).json({ error: 'Pet not found' });
      }
      res.json({ pet });
    } else {
      const { supabase } = require('../lib/supabase');
      const { data: pet, error } = await supabase
        .from('pets')
        .select('*')
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();

      if (error || !pet) {
        return res.status(404).json({ error: 'Pet not found' });
      }
      res.json({ pet });
    }
  } catch (error) {
    console.error('Pet fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch pet' });
  }
});

// Create new pet
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, species, breed, age_years, age_months, weight_kg, known_conditions, medications } = req.body;

    if (!name || !species) {
      return res.status(400).json({ error: 'Name and species are required' });
    }

    if (!['dog', 'cat'].includes(species)) {
      return res.status(400).json({ error: 'Species must be dog or cat' });
    }

    const petData = {
      user_id: req.user.id,
      name,
      species,
      breed,
      age_years,
      age_months,
      weight_kg,
      known_conditions: known_conditions || [],
      medications: medications || []
    };

    if (isLocalMode()) {
      const { data: pet, error } = await mockDb.pets.create(petData);
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      res.status(201).json({ pet });
    } else {
      const { supabase } = require('../lib/supabase');
      const { data: pet, error } = await supabase
        .from('pets')
        .insert(petData)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      res.status(201).json({ pet });
    }
  } catch (error) {
    console.error('Pet create error:', error);
    res.status(500).json({ error: 'Failed to create pet' });
  }
});

// Update pet
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, species, breed, age_years, age_months, weight_kg, known_conditions, medications } = req.body;

    const updateData = {
      name,
      species,
      breed,
      age_years,
      age_months,
      weight_kg,
      known_conditions,
      medications
    };

    if (isLocalMode()) {
      const { data: pet, error } = await mockDb.pets.update(req.params.id, req.user.id, updateData);
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      res.json({ pet });
    } else {
      const { supabase } = require('../lib/supabase');
      const { data: pet, error } = await supabase
        .from('pets')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      res.json({ pet });
    }
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
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      res.json({ message: 'Pet deleted successfully' });
    } else {
      const { supabase } = require('../lib/supabase');
      const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', req.params.id)
        .eq('user_id', req.user.id);

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      res.json({ message: 'Pet deleted successfully' });
    }
  } catch (error) {
    console.error('Pet delete error:', error);
    res.status(500).json({ error: 'Failed to delete pet' });
  }
});

module.exports = router;
