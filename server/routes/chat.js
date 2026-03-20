const express = require('express');
const router = express.Router();
const { openai } = require('../lib/openai');
const { mockDb } = require('../lib/mockStore');
const { getDb } = require('../lib/db');
const authMiddleware = require('../middleware/auth');

function isLocalMode() {
  return process.env.LOCAL_MODE === 'true';
}

const CHAT_SYSTEM_PROMPT = `You are a friendly and knowledgeable pet care assistant for Pet Parent, a pet health app. You help pet owners with general pet care questions about:
- Nutrition and diet
- Exercise and activity
- Grooming and hygiene
- Training and behavior
- General wellness tips
- Product recommendations

IMPORTANT RULES:
- You are NOT a veterinarian and cannot diagnose medical conditions
- For any medical symptoms, illness concerns, or emergencies, direct users to the Symptom Checker feature in the app
- Keep responses concise, friendly, and practical
- If asked about specific medical conditions or medications, remind the user to consult their vet
- You can reference common pet care best practices
- Be warm and conversational — pet parents want to feel supported
- Use the pet owner's pet information provided below to give personalized, relevant advice
- Reference pets by name when applicable
- Consider the pet's age, breed, diet, conditions, and history when giving advice`;

// Build a context block describing the user's pets and their history
function buildPetContext(pets, triageHistory, journalEntries) {
  if (!pets || pets.length === 0) {
    return '\n\nThe user has not added any pets yet.';
  }

  let context = '\n\nPET OWNER PROFILE:';

  pets.forEach(pet => {
    context += `\n\nPet: ${pet.name}`;
    context += `\n- Species: ${pet.species}`;
    if (pet.breed) context += `\n- Breed: ${pet.breed}`;
    if (pet.age_years || pet.age_months) {
      const parts = [];
      if (pet.age_years) parts.push(`${pet.age_years} year(s)`);
      if (pet.age_months) parts.push(`${pet.age_months} month(s)`);
      context += `\n- Age: ${parts.join(', ')}`;
    }
    if (pet.weight_kg) context += `\n- Weight: ${pet.weight_kg} kg`;
    if (pet.diet) context += `\n- Diet: ${pet.diet}`;
    if (pet.is_fixed && pet.is_fixed !== 'unknown') context += `\n- Spayed/Neutered: ${pet.is_fixed}`;
    if (pet.indoor_outdoor) context += `\n- Indoor/Outdoor: ${pet.indoor_outdoor}`;
    if (pet.known_conditions?.length) context += `\n- Known Conditions: ${pet.known_conditions.join(', ')}`;
    if (pet.medications?.length) context += `\n- Medications: ${pet.medications.join(', ')}`;
    if (pet.supplements) context += `\n- Supplements: ${pet.supplements}`;
    if (pet.recent_vaccines) context += `\n- Recent Vaccines: ${pet.recent_vaccines}`;
    if (pet.last_vet_visit) context += `\n- Last Vet Visit: ${pet.last_vet_visit}`;
    if (pet.recent_procedures) context += `\n- Recent Procedures: ${pet.recent_procedures}`;
  });

  // Add recent triage history
  if (triageHistory && triageHistory.length > 0) {
    context += '\n\nRECENT HEALTH CHECKS:';
    triageHistory.slice(0, 5).forEach(record => {
      const petName = record.pets?.name || 'Unknown pet';
      const date = new Date(record.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      context += `\n- ${petName} (${date}): ${record.urgency_level} — Symptoms: ${(record.symptoms || []).join(', ')}`;
    });
  }

  // Add recent journal entries
  if (journalEntries && journalEntries.length > 0) {
    context += '\n\nRECENT JOURNAL ENTRIES:';
    journalEntries.slice(0, 5).forEach(entry => {
      const petName = entry.pets?.name || 'Unknown pet';
      const date = new Date(entry.entry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      let summary = `${entry.entry_type}`;
      if (entry.title) summary += ` — ${entry.title}`;
      if (entry.content) summary += `: ${entry.content.substring(0, 100)}`;
      context += `\n- ${petName} (${date}): ${summary}`;
    });
  }

  return context;
}

// Fetch user's pet data and history
async function getUserPetContext(userId) {
  let pets = [], triageHistory = [], journalEntries = [];

  try {
    if (isLocalMode()) {
      const petsResult = await mockDb.pets.getAll(userId);
      pets = petsResult.data || [];

      const triageResult = await mockDb.triageHistory.getAll(userId, { limit: 5 });
      triageHistory = triageResult.data || [];

      const journalResult = await mockDb.journalEntries.getAll(userId, { limit: 5 });
      journalEntries = journalResult.data || [];
    } else {
      const sql = getDb();
      pets = await sql`SELECT * FROM pets WHERE user_id = ${userId} ORDER BY created_at DESC`;

      triageHistory = await sql`
        SELECT th.*, json_build_object('name', p.name, 'species', p.species) as pets
        FROM triage_history th
        LEFT JOIN pets p ON th.pet_id = p.id
        WHERE th.user_id = ${userId}
        ORDER BY th.created_at DESC
        LIMIT 5
      `;

      journalEntries = await sql`
        SELECT je.*, json_build_object('name', p.name, 'species', p.species) as pets
        FROM journal_entries je
        LEFT JOIN pets p ON je.pet_id = p.id
        WHERE je.user_id = ${userId}
        ORDER BY je.entry_date DESC
        LIMIT 5
      `;
    }
  } catch (error) {
    console.error('Error fetching pet context:', error);
  }

  return buildPetContext(pets, triageHistory, journalEntries);
}

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Fetch personalized pet context
    const petContext = await getUserPetContext(req.user.id);

    // Build messages array with history (last 10 messages for context)
    const messages = [
      { role: 'system', content: CHAT_SYSTEM_PROMPT + petContext }
    ];

    if (history && Array.isArray(history)) {
      const recentHistory = history.slice(-10);
      messages.push(...recentHistory);
    }

    messages.push({ role: 'user', content: message.trim() });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.7,
      max_tokens: 500
    });

    const reply = completion.choices[0].message.content;

    res.json({ reply });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

module.exports = router;
