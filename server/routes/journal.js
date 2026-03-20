const express = require('express');
const router = express.Router();
const { mockDb } = require('../lib/mockStore');
const { getDb } = require('../lib/db');
const authMiddleware = require('../middleware/auth');

function isLocalMode() {
  return process.env.LOCAL_MODE === 'true';
}

// Get journal entries
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { pet_id, entry_type, limit = 50 } = req.query;

    if (isLocalMode()) {
      const { data: entries, error } = await mockDb.journalEntries.getAll(req.user.id, {
        pet_id, entry_type, limit: parseInt(limit)
      });
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ entries });
    }

    const sql = getDb();
    let entries;

    if (pet_id && entry_type) {
      entries = await sql`
        SELECT je.*, json_build_object('name', p.name, 'species', p.species) as pets
        FROM journal_entries je
        LEFT JOIN pets p ON je.pet_id = p.id
        WHERE je.user_id = ${req.user.id} AND je.pet_id = ${pet_id} AND je.entry_type = ${entry_type}
        ORDER BY je.entry_date DESC, je.created_at DESC
        LIMIT ${parseInt(limit)}
      `;
    } else if (pet_id) {
      entries = await sql`
        SELECT je.*, json_build_object('name', p.name, 'species', p.species) as pets
        FROM journal_entries je
        LEFT JOIN pets p ON je.pet_id = p.id
        WHERE je.user_id = ${req.user.id} AND je.pet_id = ${pet_id}
        ORDER BY je.entry_date DESC, je.created_at DESC
        LIMIT ${parseInt(limit)}
      `;
    } else if (entry_type) {
      entries = await sql`
        SELECT je.*, json_build_object('name', p.name, 'species', p.species) as pets
        FROM journal_entries je
        LEFT JOIN pets p ON je.pet_id = p.id
        WHERE je.user_id = ${req.user.id} AND je.entry_type = ${entry_type}
        ORDER BY je.entry_date DESC, je.created_at DESC
        LIMIT ${parseInt(limit)}
      `;
    } else {
      entries = await sql`
        SELECT je.*, json_build_object('name', p.name, 'species', p.species) as pets
        FROM journal_entries je
        LEFT JOIN pets p ON je.pet_id = p.id
        WHERE je.user_id = ${req.user.id}
        ORDER BY je.entry_date DESC, je.created_at DESC
        LIMIT ${parseInt(limit)}
      `;
    }

    res.json({ entries });
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
      if (error || !entry) return res.status(404).json({ error: 'Entry not found' });
      return res.json({ entry });
    }

    const sql = getDb();
    const [entry] = await sql`
      SELECT je.*, json_build_object('name', p.name, 'species', p.species) as pets
      FROM journal_entries je
      LEFT JOIN pets p ON je.pet_id = p.id
      WHERE je.id = ${req.params.id} AND je.user_id = ${req.user.id}
    `;
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json({ entry });
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

    if (isLocalMode()) {
      const { data: pet, error: petError } = await mockDb.pets.get(pet_id, req.user.id);
      if (petError || !pet) return res.status(404).json({ error: 'Pet not found' });

      const { data: entry, error } = await mockDb.journalEntries.create({
        user_id: req.user.id, pet_id, entry_type, title, content,
        metadata: metadata || {},
        entry_date: entry_date || new Date().toISOString().split('T')[0]
      });
      if (error) return res.status(400).json({ error: error.message });
      return res.status(201).json({ entry });
    }

    const sql = getDb();

    // Verify pet ownership
    const [pet] = await sql`SELECT id FROM pets WHERE id = ${pet_id} AND user_id = ${req.user.id}`;
    if (!pet) return res.status(404).json({ error: 'Pet not found' });

    const dateValue = entry_date || new Date().toISOString().split('T')[0];
    const metadataValue = metadata ? JSON.stringify(metadata) : '{}';

    const [entry] = await sql`
      INSERT INTO journal_entries (user_id, pet_id, entry_type, title, content, metadata, entry_date)
      VALUES (${req.user.id}, ${pet_id}, ${entry_type}, ${title || null}, ${content || null}, ${metadataValue}::jsonb, ${dateValue})
      RETURNING *
    `;

    // Fetch with pet join
    const [entryWithPet] = await sql`
      SELECT je.*, json_build_object('name', p.name, 'species', p.species) as pets
      FROM journal_entries je
      LEFT JOIN pets p ON je.pet_id = p.id
      WHERE je.id = ${entry.id}
    `;

    res.status(201).json({ entry: entryWithPet });
  } catch (error) {
    console.error('Entry create error:', error);
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

// Update journal entry
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { pet_id, entry_type, title, content, metadata, entry_date } = req.body;

    if (isLocalMode()) {
      const updateData = { title, content, metadata, entry_date };
      if (pet_id) updateData.pet_id = pet_id;
      if (entry_type) updateData.entry_type = entry_type;

      const { data: entry, error } = await mockDb.journalEntries.update(req.params.id, req.user.id, updateData);
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ entry });
    }

    const sql = getDb();
    const [entry] = await sql`
      UPDATE journal_entries
      SET pet_id = COALESCE(${pet_id || null}, pet_id),
          entry_type = COALESCE(${entry_type || null}, entry_type),
          title = ${title !== undefined ? title : null},
          content = ${content !== undefined ? content : null},
          metadata = COALESCE(${metadata ? JSON.stringify(metadata) : null}::jsonb, metadata),
          entry_date = COALESCE(${entry_date || null}, entry_date),
          updated_at = NOW()
      WHERE id = ${req.params.id} AND user_id = ${req.user.id}
      RETURNING *
    `;

    if (!entry) return res.status(400).json({ error: 'Entry not found' });

    // Fetch with pet join
    const [entryWithPet] = await sql`
      SELECT je.*, json_build_object('name', p.name, 'species', p.species) as pets
      FROM journal_entries je
      LEFT JOIN pets p ON je.pet_id = p.id
      WHERE je.id = ${entry.id}
    `;

    res.json({ entry: entryWithPet });
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
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ message: 'Entry deleted successfully' });
    }

    const sql = getDb();
    await sql`DELETE FROM journal_entries WHERE id = ${req.params.id} AND user_id = ${req.user.id}`;
    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Entry delete error:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

module.exports = router;
