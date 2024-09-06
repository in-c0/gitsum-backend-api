// Main server file (server.js). This file sets up an Express server and imports routes for handling GitHub-related requests.
// Run with:
//    node server.js
// or
//    npx nodemon server.js
//   (for server restart on file changes)
// Once Server is running on port 3000, you can test with:
// http://localhost:3000/api/github/repo?owner=in-c0&repo=GRAKKEN-Github-Repo-Analyser

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
