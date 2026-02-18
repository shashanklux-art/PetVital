const express = require('express');
const router = express.Router();
const { mockDb } = require('../lib/mockStore');
const authMiddleware = require('../middleware/auth');

// Evaluate at runtime to ensure dotenv has loaded
function isLocalMode() {
  return process.env.LOCAL_MODE === 'true';
}

// Get journal entries
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { pet_id, entry_type, limit = 50 } = req.query;

    if (isLocalMode()) {
      const { data: entries, error } = await mockDb.journalEntries.getAll(req.user.id, {
        pet_id,
        entry_type,
        limit: parseInt(limit)
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      res.json({ entries });
    } else {
      const { supabase } = require('../lib/supabase');
      let query = supabase
        .from('journal_entries')
        .select('*, pets(name, species)')
        .eq('user_id', req.user.id)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      if (pet_id) {
        query = query.eq('pet_id', pet_id);
      }

      if (entry_type) {
        query = query.eq('entry_type', entry_type);
      }

      const { data: entries, error } = await query;

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      res.json({ entries });
    }
  } catch (error) {
    console.error('Journal fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch journal entries' });
  }
});

// Get single journal entry
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    if (isLocalMode()) {
      const { data: entry, error } = await mockDb.journalEntries.get(req.params.id, req.user.id);
      if (error || !entry) {
        return res.status(404).json({ error: 'Entry not found' });
      }
      res.json({ entry });
    } else {
      const { supabase } = require('../lib/supabase');
      const { data: entry, error } = await supabase
        .from('journal_entries')
        .select('*, pets(name, species)')
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();

      if (error || !entry) {
        return res.status(404).json({ error: 'Entry not found' });
      }
      res.json({ entry });
    }
  } catch (error) {
    console.error('Entry fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch entry' });
  }
});

// Create journal entry
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { pet_id, entry_type, title, content, metadata, entry_date } = req.body;

    if (!pet_id || !entry_type) {
      return res.status(400).json({ error: 'Pet ID and entry type are required' });
    }

    const validTypes = ['note', 'symptom', 'medication', 'vet_visit', 'weight', 'food', 'behavior'];
    if (!validTypes.includes(entry_type)) {
      return res.status(400).json({ error: 'Invalid entry type' });
    }

    // Verify pet belongs to user
    if (isLocalMode()) {
      const { data: pet, error: petError } = await mockDb.pets.get(pet_id, req.user.id);
      if (petError || !pet) {
        return res.status(404).json({ error: 'Pet not found' });
      }

      const entryData = {
        user_id: req.user.id,
        pet_id,
        entry_type,
        title,
        content,
        metadata: metadata || {},
        entry_date: entry_date || new Date().toISOString().split('T')[0]
      };

      const { data: entry, error } = await mockDb.journalEntries.create(entryData);
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      res.status(201).json({ entry });
    } else {
      const { supabase } = require('../lib/supabase');

      const { data: pet, error: petError } = await supabase
        .from('pets')
        .select('id')
        .eq('id', pet_id)
        .eq('user_id', req.user.id)
        .single();

      if (petError || !pet) {
        return res.status(404).json({ error: 'Pet not found' });
      }

      const { data: entry, error } = await supabase
        .from('journal_entries')
        .insert({
          user_id: req.user.id,
          pet_id,
          entry_type,
          title,
          content,
          metadata: metadata || {},
          entry_date: entry_date || new Date().toISOString().split('T')[0]
        })
        .select('*, pets(name, species)')
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      res.status(201).json({ entry });
    }
  } catch (error) {
    console.error('Entry create error:', error);
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

// Update journal entry
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, content, metadata, entry_date } = req.body;

    if (isLocalMode()) {
      const { data: entry, error } = await mockDb.journalEntries.update(req.params.id, req.user.id, {
        title,
        content,
        metadata,
        entry_date
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      res.json({ entry });
    } else {
      const { supabase } = require('../lib/supabase');
      const { data: entry, error } = await supabase
        .from('journal_entries')
        .update({
          title,
          content,
          metadata,
          entry_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .select('*, pets(name, species)')
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      res.json({ entry });
    }
  } catch (error) {
    console.error('Entry update error:', error);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

// Delete journal entry
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (isLocalMode()) {
      const { error } = await mockDb.journalEntries.delete(req.params.id, req.user.id);
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      res.json({ message: 'Entry deleted successfully' });
    } else {
      const { supabase } = require('../lib/supabase');
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', req.params.id)
        .eq('user_id', req.user.id);

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      res.json({ message: 'Entry deleted successfully' });
    }
  } catch (error) {
    console.error('Entry delete error:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

module.exports = router;
