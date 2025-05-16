const express = require('express');
const router = express.Router();
const Question = require('../models/Question');

// GET random question by type and category
// ✅ COMBINED: Get truth and dare
router.get('/questions', async (req, res) => {
  const { category = 'normal', limit = 10 } = req.query;
  const parsedLimit = parseInt(limit, 10);

  if (!['normal', 'adult'].includes(category) || isNaN(parsedLimit) || parsedLimit <= 0) {
    return res.status(400).json({ message: 'Invalid category or limit' });
  }

  try {
    const [truth, dare] = await Promise.all([
      Question.aggregate([
        { $match: { type: 'truth', category } },
        { $sample: { size: parsedLimit } }
      ]),
      Question.aggregate([
        { $match: { type: 'dare', category } },
        { $sample: { size: parsedLimit } }
      ])
    ]);

    return res.json({ truth, dare });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ⚠️ THIS MUST BE AFTER /questions
router.get('/:type', async (req, res) => {
  const { type } = req.params;
  const { category = 'normal', limit = 10 } = req.query;

  if (!['truth', 'dare'].includes(type)) {
    return res.status(400).json({ message: 'Invalid type' });
  }

  try {
    const questions = await Question.aggregate([
      { $match: { type, category } },
      { $sample: { size: parseInt(limit, 10) || 10 } }
    ]);
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST add new question
router.post('/add', async (req, res) => {
  const questions = req.body;

  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ message: 'Input should be a non-empty array' });
  }

  const validTypes = ['truth', 'dare'];
  const validCategories = ['normal', 'adult'];

  // Validate all questions
  for (const q of questions) {
    if (
      !q.text || !q.type ||
      !validTypes.includes(q.type) ||
      (q.category && !validCategories.includes(q.category))
    ) {
      return res.status(400).json({ message: 'Invalid input in one or more items' });
    }
  }

  try {
    const created = await Question.insertMany(questions.map(q => ({
      text: q.text,
      type: q.type,
      category: q.category || 'normal'
    })));

    res.json({
      message: `${created.length} questions added successfully.`,
      data: created
    });
  } catch (error) {
    res.status(500).json({ message: 'Error inserting questions', error: error.message });
  }
});

module.exports = router;
