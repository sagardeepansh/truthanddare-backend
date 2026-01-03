const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const OpenAI = require("openai");

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

router.post("/aiQuestion", async (req, res) => {
  try {
    const client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      // apiKey: '',
      baseURL: "https://api.groq.com/openai/v1",
    });

    let interest = req?.body?.interest || '';
    let limit = req?.body?.limit;
    let category = req?.body?.category

    // const adPrompt = `Generate adult, flirty, romantic, and intimate 18+ couple truth and dare questions. The content may include sexual themes such as kissing, making out, teasing, fantasies, attraction, and sexual innuendo — but must avoid explicit or graphic sexual descriptions. Keep everything playful, sensual, naughty, and suitable for a couple's intimate game.\n\nReturn at least ${limit} truth questions and at least ${limit} dare prompts.\n\nReturn the output strictly in the following JSON format:\n\n{\n  \"truth\": [\n    {\n      \"_id\": \"random_id_here\",\n      \"type\": \"truth\",\n      \"category\": \"adult\",\n      \"text\": \"sample truth question here\",\n      \"__v\": 0\n    }\n  ],\n  \"dare\": [\n    {\n      \"_id\": \"random_id_here\",\n      \"type\": \"dare\",\n      \"category\": \"adult\",\n      \"text\": \"sample dare here\",\n      \"__v\": 0\n    }\n  ]\n}\n\nEnsure:\n- A minimum of ${limit} truth questions.\n- A minimum of ${limit} dares.\n- All items should feel teasing, sensual, or suggestive but not explicit.\n- Tone should be sexy, intimate, and flirtatious.\n- Output must be valid JSON only.`

    const adPrompt = `Generate adult, flirty, romantic, and intimate 18+ truth and dare questions suitable for 2 or more players. The content may include sexual themes such as kissing, making out, teasing, fantasies, attraction, and sexual innuendo — but must avoid explicit or graphic sexual descriptions. Keep everything playful, sensual, naughty, and suitable for an intimate game. Questions and dares should work whether 2 people are playing or a small group.\n\nReturn at least ${limit} truth questions and at least ${limit} dare prompts.\n\nReturn the output strictly in the following JSON format:\n\n{\n  \"truth\": [\n    {\n      \"_id\": \"random_id_here\",\n      \"type\": \"truth\",\n      \"category\": \"adult\",\n      \"text\": \"sample truth question here\",\n      \"__v\": 0\n    }\n  ],\n  \"dare\": [\n    {\n      \"_id\": \"random_id_here\",\n      \"type\": \"dare\",\n      \"category\": \"adult\",\n      \"text\": \"sample dare here\",\n      \"__v\": 0\n    }\n  ]\n}\n\nEnsure:\n- A minimum of ${limit} truth questions.\n- A minimum of ${limit} dares.\n- All items should feel teasing, sensual, or suggestive but not explicit.\n- Questions and dares must work for multiple players, not just couples.\n- Tone should be sexy, intimate, and flirtatious.\n- Output must be valid JSON only.`;



    const norPrompt = `Generate fun, meaningful, deep, personal, and secret-revealing truth and dare questions suitable for any group of people (friends, family, coworkers, or mixed groups). The questions should encourage people to share hidden sides of themselves, interesting secrets, untold stories, personal experiences, and things others might not know about them. Avoid adult, romantic, or sexual content. Focus on personality, memories, life experiences, fears, dreams, opinions, secrets, humor, and self-discovery. Keep all questions and dares related to ${interest}.\n\nReturn at least ${limit} truth questions and at least ${limit} dare prompts.\n\nReturn the output strictly in the following JSON format:\n\n{\n  \"truth\": [\n    {\n      \"_id\": \"random_id_here\",\n      \"type\": \"truth\",\n      \"category\": \"normal\",\n      \"text\": \"sample truth question here\",\n      \"__v\": 0\n    }\n  ],\n  \"dare\": [\n    {\n      \"_id\": \"random_id_here\",\n      \"type\": \"dare\",\n      \"category\": \"normal\",\n      \"text\": \"sample dare here\",\n      \"__v\": 0\n    }\n  ]\n}\n\nEnsure:\n- At least ${limit} truth questions.\n- At least ${limit} dares.\n- All content must be friendly, non-adult, and appropriate for any group.\n- Truth questions should uncover secrets, personal insights, or unknown facts.\n- Dares should be playful, creative, or mildly challenging, but always safe.\n- Output must be valid JSON only.`;



    const completion = await client.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        { role: "user", content: category == 'adult' ? adPrompt : norPrompt || "Hello" }
      ],
    });
    // console.log('completion', completion.choices[0].message)

    // Remove markdown code fences
    let clean = completion.choices[0].message.content.replace(/```json|```/g, "");

    // Convert to usable JSON
    let jsonData = JSON.parse(clean);

    const questionsToInsert = [
      ...jsonData.truth,
      ...jsonData.dare
    ].map(q => ({
      type: q.type,
      category: q.category,
      text: q.text
    }));

    // Insert into MongoDB
    const savedQuestions = await Question.insertMany(questionsToInsert);

    // console.log(jsonData);

    res.status(200).json(jsonData);

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: "Something went wrong",
      details: error.message
    });
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
