const axios = require('axios');
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to fetch repository contents
const fetchRepoContents = async (owner, repo, path = '') => {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        headers: { Authorization: `token ${process.env.GITHUB_API_TOKEN}` }
    });
    return response.data;
};

// Vercel API handler function
module.exports = async (req, res) => {
    if (req.method === 'GET') {
        const { owner, repo } = req.query;

        if (!owner || !repo) {
            return res.status(400).json({ message: 'Owner and repo are required.' });
        }

        try {
            // Fetch the repository contents
            const repoContents = await fetchRepoContents(owner, repo);

            // Get README content if it exists
            const readme = repoContents.find(file => file.name.toLowerCase() === 'readme.md');
            let readmeContent = '';
            if (readme) {
                const readmeResponse = await axios.get(readme.download_url);
                readmeContent = readmeResponse.data;
            }

            // Generate summary using OpenAI
            const prompt = `Summarize the following GitHub repository:
            Repository: ${owner}/${repo}
            Repo Contents: ${repoContents.map(item => item.name).join(', ')}
            README: ${readmeContent.slice(0, 1000)}...`;

            const completion = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        "role": "system",
                        "content": "You are a helpful summariser of a GitHub repository. The aim is to make the repository easy to understand for non-technical background users."
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

            // Return summary in response
            return res.json({
                message: `Summary of ${owner}/${repo}`,
                summary,
            });
        } catch (error) {
            console.error('Error in /repo route:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    } else {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }
};
