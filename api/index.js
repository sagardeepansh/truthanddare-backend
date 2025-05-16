const express = require('express');
const app = express();

// Your existing middleware, routes, etc.
// Example:
const questionsRouter = require('../routes/questions');
app.use('/api', questionsRouter);

app.get('/', (req, res) => {
  res.send('Hello from Express on Vercel!');
});

module.exports = app;
