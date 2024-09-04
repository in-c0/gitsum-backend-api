require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON requests
app.use(express.json());

// Import GitHub routes
const githubRoutes = require('./routes/github');
app.use('/api/github', githubRoutes);

// Root route (for basic health check)
app.get('/', (req, res) => {
    res.send('Grakken AI Backend is running...');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
