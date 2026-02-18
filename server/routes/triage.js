const express = require('express');
const router = express.Router();
const { mockDb } = require('../lib/mockStore');
const { assessSymptoms } = require('../lib/openai');
const authMiddleware = require('../middleware/auth');

// Evaluate at runtime to ensure dotenv has loaded
function isLocalMode() {
  return process.env.LOCAL_MODE === 'true';
}

// Perform triage assessment
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { pet_id, symptoms, duration, severity, notes } = req.body;
    const user_id = req.user.id;

    if (!pet_id || !symptoms || symptoms.length === 0) {
      return res.status(400).json({ error: 'Pet ID and symptoms are required' });
    }

    // Get pet details
    let pet;
    if (isLocalMode()) {
      const { data, error } = await mockDb.pets.get(pet_id, user_id);
      if (error || !data) {
        return res.status(404).json({ error: 'Pet not found' });
      }
      pet = data;
    } else {
      const { supabase } = require('../lib/supabase');
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('id', pet_id)
        .eq('user_id', user_id)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Pet not found' });
      }
      pet = data;
    }

    // Get AI assessment
    const aiResponse = await assessSymptoms(pet, symptoms, duration, severity, notes);

    // Save to database
    const triageData = {
      user_id,
      pet_id,
      symptoms,
      additional_notes: notes,
      urgency_level: aiResponse.urgency_level,
      ai_response: JSON.stringify(aiResponse),
      possible_conditions: aiResponse.possible_conditions
    };

    let triageRecord;
    if (isLocalMode()) {
      const { data, error } = await mockDb.triageHistory.create(triageData);
      if (error) {
        console.error('Error saving triage:', error);
      }
      triageRecord = data;
    } else {
      const { supabase } = require('../lib/supabase');
      const { data, error } = await supabase
        .from('triage_history')
        .insert(triageData)
        .select()
        .single();

      if (error) {
        console.error('Error saving triage:', error);
      }
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
        pet_id,
        urgency_level,
        limit: parseInt(limit)
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      res.json({ history });
    } else {
      const { supabase } = require('../lib/supabase');
      let query = supabase
        .from('triage_history')
        .select('*, pets(name, species)')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      if (pet_id) {
        query = query.eq('pet_id', pet_id);
      }

      if (urgency_level) {
        query = query.eq('urgency_level', urgency_level);
      }

      const { data: history, error } = await query;

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      res.json({ history });
    }
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
      if (error || !record) {
        return res.status(404).json({ error: 'Record not found' });
      }
      res.json({ record });
    } else {
      const { supabase } = require('../lib/supabase');
      const { data: record, error } = await supabase
        .from('triage_history')
        .select('*, pets(name, species)')
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();

      if (error || !record) {
        return res.status(404).json({ error: 'Record not found' });
      }
      res.json({ record });
    }
  } catch (error) {
    console.error('Record fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch triage record' });
  }
});

module.exports = router;
