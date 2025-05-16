const express = require('express');
const mongoose = require('mongoose');
const app = express();
const questionRoutes = require('../routes/questions');
const cors = require('cors');

require('dotenv').config();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://deepanshsagar:UMzd6JOu0XR5nHlF@cluster0.cs8pize.mongodb.net/truthanddare?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log(err));

app.use('/api', questionRoutes);

app.get('/', (req, res) => {
  res.send('Hello from Express on Vercel!');
});


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
