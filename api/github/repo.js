const axios = require('axios');
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,  // Make sure this is set in Vercel's environment settings
});

// Helper function to fetch repository contents
const fetchRepoContents = async (owner, repo, path = '') => {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        headers: { Authorization: `token ${process.env.GITHUB_API_TOKEN}` }  // Also set in Vercel's environment settings
    });
    return response.data;
};

// The Vercel serverless function handler for /api/github/repo
module.exports = async (req, res) => {
    if (req.method === 'GET') {
        const { owner, repo } = req.query;

        if (!owner || !repo) {
            return res.status(400).json({ message: 'Owner and repo are required.' });
        }

        try {
            // Fetch the repository contents from GitHub
            const repoContents = await fetchRepoContents(owner, repo);

            // Get README content if it exists
            const readme = repoContents.find(file => file.name.toLowerCase() === 'readme.md');
            let readmeContent = '';
            if (readme) {
                const readmeResponse = await axios.get(readme.download_url);
                readmeContent = readmeResponse.data;
            }

            // Generate summary using OpenAI
            const completion = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        "role": "system",
                        "content": "You are a helpful summarizer of a GitHub repository. Make it easy for non-technical users to understand."
                    },
                    {
                        "role": "user",
                        "content": `Summarize the following GitHub repository:
                        Repository: ${owner}/${repo}
                        Contents: ${repoContents.map(item => item.name).join(', ')}
                        README: ${readmeContent}`
                    }
                ],
            });

            const summary = completion.choices[0].message.content.trim();

            // Return summary as the API response
            return res.json({
                message: `Summary of ${owner}/${repo}`,
                summary,
            });
        } catch (error) {
            console.error('Error in /api/github/repo:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    } else {
        // If the request is not a GET request
        return res.status(405).json({ message: 'Method Not Allowed' });
    }
};
