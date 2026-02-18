const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const authMiddleware = require('../middleware/auth');
const { mockDb } = require('../lib/mockStore');

// Evaluate at runtime to ensure dotenv has loaded
function isLocalMode() {
  return process.env.LOCAL_MODE === 'true';
}

// Export triage record as PDF
router.get('/triage/:id', authMiddleware, async (req, res) => {
  try {
    let record, pet;

    if (isLocalMode()) {
      const { data: triageRecord, error } = await mockDb.triageHistory.get(req.params.id);
      if (error || !triageRecord || triageRecord.user_id !== req.user.id) {
        return res.status(404).json({ error: 'Record not found' });
      }
      record = triageRecord;

      const { data: petData } = await mockDb.pets.get(record.pet_id);
      pet = petData;
    } else {
      const { supabase } = require('../lib/supabase');
      const { data, error } = await supabase
        .from('triage_history')
        .select('*, pets(name, species, breed, age_years, age_months)')
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Record not found' });
      }
      record = data;
      pet = data.pets;
    }

    const aiResponse = JSON.parse(record.ai_response);

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="triage-${record.id}.pdf"`);

    // Pipe to response
    doc.pipe(res);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('PetVital', { align: 'center' });
    doc.fontSize(14).font('Helvetica').text('Pet Health Triage Report', { align: 'center' });
    doc.moveDown(2);

    // Date
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.moveDown();

    // Pet Information
    doc.fontSize(16).font('Helvetica-Bold').text('Pet Information');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    doc.text(`Name: ${pet.name}`);
    doc.text(`Species: ${pet.species.charAt(0).toUpperCase() + pet.species.slice(1)}`);
    if (pet.breed) doc.text(`Breed: ${pet.breed}`);
    if (pet.age_years || pet.age_months) {
      doc.text(`Age: ${pet.age_years || 0} years, ${pet.age_months || 0} months`);
    }
    doc.moveDown();

    // Urgency Level
    doc.fontSize(16).font('Helvetica-Bold').text('Assessment Result');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    const urgencyColors = {
      emergency: '#DC2626',
      urgent: '#F97316',
      soon: '#EAB308',
      monitor: '#22C55E'
    };

    const urgencyLabels = {
      emergency: 'EMERGENCY - Go to vet NOW',
      urgent: 'URGENT - See vet within 24 hours',
      soon: 'SOON - Schedule within 2-3 days',
      monitor: 'MONITOR - Watch at home'
    };

    doc.fontSize(14).font('Helvetica-Bold')
      .fillColor(urgencyColors[record.urgency_level])
      .text(urgencyLabels[record.urgency_level]);
    doc.fillColor('#000000');
    doc.moveDown();

    doc.fontSize(12).font('Helvetica').text(aiResponse.summary);
    doc.moveDown();

    // Symptoms Reported
    doc.fontSize(16).font('Helvetica-Bold').text('Symptoms Reported');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    record.symptoms.forEach(symptom => {
      doc.text(`• ${symptom}`);
    });
    if (record.additional_notes) {
      doc.moveDown(0.5);
      doc.text(`Additional notes: ${record.additional_notes}`);
    }
    doc.moveDown();

    // Reasoning
    doc.fontSize(16).font('Helvetica-Bold').text('Assessment Reasoning');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(aiResponse.reasoning);
    doc.moveDown();

    // Possible Conditions
    if (aiResponse.possible_conditions?.length > 0) {
      doc.fontSize(16).font('Helvetica-Bold').text('Possible Conditions');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica-Oblique')
        .text('These are possibilities, not diagnoses. Only a veterinarian can diagnose.');
      doc.fontSize(12).font('Helvetica');
      aiResponse.possible_conditions.forEach(condition => {
        doc.text(`• ${condition}`);
      });
      doc.moveDown();
    }

    // Immediate Actions
    if (aiResponse.immediate_actions?.length > 0) {
      doc.fontSize(16).font('Helvetica-Bold').text('Recommended Actions');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');
      aiResponse.immediate_actions.forEach(action => {
        doc.text(`• ${action}`);
      });
      doc.moveDown();
    }

    // Warning Signs
    if (aiResponse.warning_signs?.length > 0) {
      doc.fontSize(16).font('Helvetica-Bold').text('Warning Signs to Watch For');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');
      aiResponse.warning_signs.forEach(sign => {
        doc.text(`• ${sign}`);
      });
      doc.moveDown();
    }

    // Disclaimer
    doc.moveDown();
    doc.fontSize(10).font('Helvetica-Oblique')
      .text('Disclaimer: This report is generated by an AI-powered tool and is for informational purposes only. It does not constitute veterinary medical advice, diagnosis, or treatment. Always seek the advice of a qualified veterinarian with any questions you may have regarding your pet\'s health.', {
        align: 'justify'
      });

    // Assessment date
    doc.moveDown();
    doc.fontSize(10).font('Helvetica')
      .text(`Assessment Date: ${new Date(record.created_at).toLocaleString()}`);

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Export pet health summary as PDF
router.get('/pet/:id/summary', authMiddleware, async (req, res) => {
  try {
    let pet, triageHistory, journalEntries;

    if (isLocalMode()) {
      const { data: petData, error: petError } = await mockDb.pets.get(req.params.id);
      if (petError || !petData || petData.user_id !== req.user.id) {
        return res.status(404).json({ error: 'Pet not found' });
      }
      pet = petData;

      const { data: triageData } = await mockDb.triageHistory.getAll({ pet_id: pet.id });
      triageHistory = (triageData || []).slice(0, 10);

      const { data: journalData } = await mockDb.journalEntries.getAll({ pet_id: pet.id });
      journalEntries = (journalData || []).slice(0, 20);
    } else {
      const { supabase } = require('../lib/supabase');

      // Get pet
      const { data: petData, error: petError } = await supabase
        .from('pets')
        .select('*')
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();

      if (petError || !petData) {
        return res.status(404).json({ error: 'Pet not found' });
      }
      pet = petData;

      // Get recent triage history
      const { data: triageData } = await supabase
        .from('triage_history')
        .select('*')
        .eq('pet_id', pet.id)
        .order('created_at', { ascending: false })
        .limit(10);
      triageHistory = triageData;

      // Get recent journal entries
      const { data: journalData } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('pet_id', pet.id)
        .order('entry_date', { ascending: false })
        .limit(20);
      journalEntries = journalData;
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pet.name}-health-summary.pdf"`);

    doc.pipe(res);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('PetVital', { align: 'center' });
    doc.fontSize(14).font('Helvetica').text('Pet Health Summary', { align: 'center' });
    doc.moveDown(2);

    // Pet Information
    doc.fontSize(20).font('Helvetica-Bold').text(pet.name);
    doc.fontSize(12).font('Helvetica');
    doc.text(`Species: ${pet.species.charAt(0).toUpperCase() + pet.species.slice(1)}`);
    if (pet.breed) doc.text(`Breed: ${pet.breed}`);
    if (pet.age_years || pet.age_months) {
      doc.text(`Age: ${pet.age_years || 0} years, ${pet.age_months || 0} months`);
    }
    if (pet.weight_kg) doc.text(`Weight: ${pet.weight_kg} kg`);
    doc.moveDown();

    // Known Conditions
    if (pet.known_conditions?.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Known Conditions');
      doc.fontSize(12).font('Helvetica');
      pet.known_conditions.forEach(condition => {
        doc.text(`• ${condition}`);
      });
      doc.moveDown();
    }

    // Current Medications
    if (pet.medications?.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Current Medications');
      doc.fontSize(12).font('Helvetica');
      pet.medications.forEach(med => {
        doc.text(`• ${med}`);
      });
      doc.moveDown();
    }

    // Recent Triage History
    if (triageHistory?.length > 0) {
      doc.fontSize(16).font('Helvetica-Bold').text('Recent Symptom Checks');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      triageHistory.forEach(record => {
        const date = new Date(record.created_at).toLocaleDateString();
        doc.fontSize(12).font('Helvetica-Bold')
          .text(`${date} - ${record.urgency_level.toUpperCase()}`);
        doc.fontSize(11).font('Helvetica')
          .text(`Symptoms: ${record.symptoms.join(', ')}`);
        doc.moveDown(0.5);
      });
      doc.moveDown();
    }

    // Recent Journal Entries
    if (journalEntries?.length > 0) {
      doc.fontSize(16).font('Helvetica-Bold').text('Recent Journal Entries');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      journalEntries.forEach(entry => {
        const date = new Date(entry.entry_date).toLocaleDateString();
        doc.fontSize(12).font('Helvetica-Bold')
          .text(`${date} - ${entry.entry_type.charAt(0).toUpperCase() + entry.entry_type.slice(1)}`);
        if (entry.title) {
          doc.fontSize(11).font('Helvetica').text(entry.title);
        }
        if (entry.content) {
          doc.fontSize(10).font('Helvetica').text(entry.content, { maxWidth: 500 });
        }
        doc.moveDown(0.5);
      });
    }

    // Footer
    doc.moveDown();
    doc.fontSize(10).font('Helvetica')
      .text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });

    doc.end();

  } catch (error) {
    console.error('Summary export error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

module.exports = router;
