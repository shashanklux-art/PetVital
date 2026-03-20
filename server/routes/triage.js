const express = require('express');
const router = express.Router();
const { mockDb } = require('../lib/mockStore');
const { getDb } = require('../lib/db');
const { assessSymptoms } = require('../lib/openai');
const authMiddleware = require('../middleware/auth');

function isLocalMode() {
  return process.env.LOCAL_MODE === 'true';
}

// Perform triage assessment
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { pet_id, symptoms, duration, severity, notes, free_text } = req.body;
    const user_id = req.user.id;

    if (!pet_id || ((!symptoms || symptoms.length === 0) && !free_text)) {
      return res.status(400).json({ error: 'Pet ID and either symptoms or description are required' });
    }

    let pet;
    if (isLocalMode()) {
      const { data, error } = await mockDb.pets.get(pet_id, user_id);
      if (error || !data) return res.status(404).json({ error: 'Pet not found' });
      pet = data;
    } else {
      const sql = getDb();
      const [petData] = await sql`
        SELECT * FROM pets WHERE id = ${pet_id} AND user_id = ${user_id}
      `;
      if (!petData) return res.status(404).json({ error: 'Pet not found' });
      pet = petData;
    }

    const aiResponse = await assessSymptoms(pet, symptoms || [], duration, severity, notes, free_text);

    const triageData = {
      user_id, pet_id, symptoms: symptoms || [],
      additional_notes: notes,
      urgency_level: aiResponse.urgency_level,
      ai_response: JSON.stringify(aiResponse),
      possible_conditions: aiResponse.possible_conditions
    };

    let triageRecord;
    if (isLocalMode()) {
      const { data, error } = await mockDb.triageHistory.create(triageData);
      if (error) console.error('Error saving triage:', error);
      triageRecord = data;
    } else {
      const sql = getDb();
      const [data] = await sql`
        INSERT INTO triage_history (user_id, pet_id, symptoms, additional_notes, urgency_level, ai_response, possible_conditions)
        VALUES (${user_id}, ${pet_id}, ${symptoms}, ${notes || null}, ${aiResponse.urgency_level}, ${JSON.stringify(aiResponse)}, ${aiResponse.possible_conditions || []})
        RETURNING *
      `;
      triageRecord = data;
    }

    res.json({
      success: true,
      result: aiResponse,
      triage_id: triageRecord?.id
    });
  } catch (error) {
    console.error('Triage error:', error);
    res.status(500).json({ error: 'Failed to process triage request' });
  }
});

// Get triage history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { pet_id, urgency_level, limit = 50 } = req.query;

    if (isLocalMode()) {
      const { data: history, error } = await mockDb.triageHistory.getAll(req.user.id, {
        pet_id, urgency_level, limit: parseInt(limit)
      });
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ history });
    }

    const sql = getDb();
    let history;

    if (pet_id && urgency_level) {
      history = await sql`
        SELECT th.*, json_build_object('name', p.name, 'species', p.species) as pets
        FROM triage_history th
        LEFT JOIN pets p ON th.pet_id = p.id
        WHERE th.user_id = ${req.user.id} AND th.pet_id = ${pet_id} AND th.urgency_level = ${urgency_level}
        ORDER BY th.created_at DESC
        LIMIT ${parseInt(limit)}
      `;
    } else if (pet_id) {
      history = await sql`
        SELECT th.*, json_build_object('name', p.name, 'species', p.species) as pets
        FROM triage_history th
        LEFT JOIN pets p ON th.pet_id = p.id
        WHERE th.user_id = ${req.user.id} AND th.pet_id = ${pet_id}
        ORDER BY th.created_at DESC
        LIMIT ${parseInt(limit)}
      `;
    } else if (urgency_level) {
      history = await sql`
        SELECT th.*, json_build_object('name', p.name, 'species', p.species) as pets
        FROM triage_history th
        LEFT JOIN pets p ON th.pet_id = p.id
        WHERE th.user_id = ${req.user.id} AND th.urgency_level = ${urgency_level}
        ORDER BY th.created_at DESC
        LIMIT ${parseInt(limit)}
      `;
    } else {
      history = await sql`
        SELECT th.*, json_build_object('name', p.name, 'species', p.species) as pets
        FROM triage_history th
        LEFT JOIN pets p ON th.pet_id = p.id
        WHERE th.user_id = ${req.user.id}
        ORDER BY th.created_at DESC
        LIMIT ${parseInt(limit)}
      `;
    }

    res.json({ history });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch triage history' });
  }
});

// Get single triage record
router.get('/history/:id', authMiddleware, async (req, res) => {
  try {
    if (isLocalMode()) {
      const { data: record, error } = await mockDb.triageHistory.get(req.params.id, req.user.id);
      if (error || !record) return res.status(404).json({ error: 'Record not found' });
      return res.json({ record });
    }

    const sql = getDb();
    const [record] = await sql`
      SELECT th.*, json_build_object('name', p.name, 'species', p.species) as pets
      FROM triage_history th
      LEFT JOIN pets p ON th.pet_id = p.id
      WHERE th.id = ${req.params.id} AND th.user_id = ${req.user.id}
    `;
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json({ record });
  } catch (error) {
    console.error('Record fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch triage record' });
  }
});

module.exports = router;
