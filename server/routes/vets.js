const express = require('express');
const router = express.Router();
const { mockDb } = require('../lib/mockStore');

// Evaluate at runtime to ensure dotenv has loaded
function isLocalMode() {
  return process.env.LOCAL_MODE === 'true';
}

// Get vet clinics (public endpoint)
router.get('/', async (req, res) => {
  try {
    const { city, emergency_only, is_24_hour } = req.query;

    if (isLocalMode()) {
      const { data: clinics, error } = await mockDb.vetClinics.getAll({
        city,
        emergency_only,
        is_24_hour
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      res.json({ clinics });
    } else {
      const { supabase } = require('../lib/supabase');
      let query = supabase
        .from('vet_clinics')
        .select('*')
        .order('rating', { ascending: false });

      if (city) {
        query = query.ilike('city', `%${city}%`);
      }

      if (emergency_only === 'true') {
        query = query.eq('is_emergency', true);
      }

      if (is_24_hour === 'true') {
        query = query.eq('is_24_hour', true);
      }

      const { data: clinics, error } = await query;

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      res.json({ clinics });
    }
  } catch (error) {
    console.error('Vets fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch vet clinics' });
  }
});

// Get single vet clinic
router.get('/:id', async (req, res) => {
  try {
    if (isLocalMode()) {
      const { data: clinic, error } = await mockDb.vetClinics.get(req.params.id);
      if (error || !clinic) {
        return res.status(404).json({ error: 'Clinic not found' });
      }
      res.json({ clinic });
    } else {
      const { supabase } = require('../lib/supabase');
      const { data: clinic, error } = await supabase
        .from('vet_clinics')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (error || !clinic) {
        return res.status(404).json({ error: 'Clinic not found' });
      }
      res.json({ clinic });
    }
  } catch (error) {
    console.error('Clinic fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch clinic' });
  }
});

module.exports = router;
