const express = require('express');
const router = express.Router();
const { mockDb } = require('../lib/mockStore');
const { getDb } = require('../lib/db');

function isLocalMode() {
  return process.env.LOCAL_MODE === 'true';
}

// Get vet clinics (public endpoint)
router.get('/', async (req, res) => {
  try {
    const { city, emergency_only, is_24_hour } = req.query;

    if (isLocalMode()) {
      const { data: clinics, error } = await mockDb.vetClinics.getAll({
        city, emergency_only, is_24_hour
      });
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ clinics });
    }

    const sql = getDb();
    let clinics;

    if (city && emergency_only === 'true' && is_24_hour === 'true') {
      clinics = await sql`
        SELECT * FROM vet_clinics
        WHERE city ILIKE ${'%' + city + '%'} AND is_emergency = true AND is_24_hour = true
        ORDER BY rating DESC
      `;
    } else if (city && emergency_only === 'true') {
      clinics = await sql`
        SELECT * FROM vet_clinics
        WHERE city ILIKE ${'%' + city + '%'} AND is_emergency = true
        ORDER BY rating DESC
      `;
    } else if (city && is_24_hour === 'true') {
      clinics = await sql`
        SELECT * FROM vet_clinics
        WHERE city ILIKE ${'%' + city + '%'} AND is_24_hour = true
        ORDER BY rating DESC
      `;
    } else if (emergency_only === 'true' && is_24_hour === 'true') {
      clinics = await sql`
        SELECT * FROM vet_clinics
        WHERE is_emergency = true AND is_24_hour = true
        ORDER BY rating DESC
      `;
    } else if (city) {
      clinics = await sql`
        SELECT * FROM vet_clinics
        WHERE city ILIKE ${'%' + city + '%'}
        ORDER BY rating DESC
      `;
    } else if (emergency_only === 'true') {
      clinics = await sql`
        SELECT * FROM vet_clinics WHERE is_emergency = true ORDER BY rating DESC
      `;
    } else if (is_24_hour === 'true') {
      clinics = await sql`
        SELECT * FROM vet_clinics WHERE is_24_hour = true ORDER BY rating DESC
      `;
    } else {
      clinics = await sql`SELECT * FROM vet_clinics ORDER BY rating DESC`;
    }

    res.json({ clinics });
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
      if (error || !clinic) return res.status(404).json({ error: 'Clinic not found' });
      return res.json({ clinic });
    }

    const sql = getDb();
    const [clinic] = await sql`SELECT * FROM vet_clinics WHERE id = ${req.params.id}`;
    if (!clinic) return res.status(404).json({ error: 'Clinic not found' });
    res.json({ clinic });
  } catch (error) {
    console.error('Clinic fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch clinic' });
  }
});

module.exports = router;
