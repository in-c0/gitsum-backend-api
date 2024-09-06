//  Handles API requests related to GitHub. This is where you’ll fetch the repository structure and files.
const express = require('express');
const router = express.Router();
const axios = require('axios');

// Helper function to fetch repository contents
const fetchRepoContents = async (owner, repo, path = '') => {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        headers: { Authorization: `token ${process.env.GITHUB_API_TOKEN}` }
    });
    return response.data;
};

// Route to fetch and summarize GitHub repository contents
router.get('/repo', async (req, res) => {
    const { owner, repo } = req.query; // Expect owner and repo in query params
    if (!owner || !repo) {
        return res.status(400).json({ message: 'Owner and repo are required.' });
    }

    try {
        // Fetch the repository contents
        const repoContents = await fetchRepoContents(owner, repo);
        
        // Summarize important files (e.g., README.md)
        const readme = repoContents.find(file => file.name === 'README.md');
        if (readme) {
            const readmeContent = await axios.get(readme.download_url);
            // Placeholder for summarization (replace with OpenAI API call)
            const summary = readmeContent.data.slice(0, 100) + '...'; // Simple truncation for now

            res.json({
                message: `Summary of ${owner}/${repo}`,
                summary,
            });
        } else {
            res.json({ message: 'README.md not found' });
        }
    } catch (error) {
        console.error('Error fetching repo contents:', error);
        res.status(500).json({ message: 'Error fetching repository contents' });
    }
});

module.exports = router;