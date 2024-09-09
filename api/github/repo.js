import { Octokit } from '@octokit/rest';
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const octokit = new Octokit({ auth: process.env.GITHUB_API_KEY });

// Helper function to fetch repository tree structure
const fetchRepoContents = async (owner, repo, recursive = false, path = '') => {
    try {
        // Fetch the repository's tree structure (either top-level or recursive)
        const { data } = await octokit.git.getTree({
            owner,
            repo,
            tree_sha: 'HEAD',
            recursive,  // Set recursive based on the request
        });

        // If a specific path is provided, filter the tree to only include files in that path
        if (path) {
            return data.tree.filter(item => item.path.startsWith(path));
        }

        return data.tree;
    } catch (error) {
        console.error('Error fetching GitHub repository contents:', error);
        throw error;
    }
};
// The Vercel serverless function handler for /api/github/repo
export default async (req, res) => {
    if (req.method === 'GET') {
        const { owner, repo } = req.query;

        if (!owner || !repo) {
            return res.status(400).json({ message: 'Owner and repo are required.' });
        }

        try {
            // Fetch the repository contents from GitHub
            const repoContents = await fetchRepoContents(owner, repo);
            // console.log('Fetched repo contents:', repoContents);
                        
            // Find the README.md file (wherever it is in the structure)
            let readmeContent = '';
            try {
                const { data: readmeData } = await octokit.repos.getReadme({
                    owner,
                    repo
                });
                readmeContent = Buffer.from(readmeData.content, 'base64').toString();
            } catch (err) {
                console.error('Error fetching README content:', err);
            }
            

            // Generate summary using OpenAI (using truncated content for faster response)
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
                        Contents: ${repoContents.map(item => item.path).join(', ')}
                        README: ${readmeContent.slice(0, 1000)}...`  // Limit the length of the README
                    }
                ],
            });

            const summary = completion.choices[0].message.content.trim();

            // Return the summary and the top-level repo contents
            return res.json({
                message: `Summary of ${owner}/${repo}`,
                summary,
                topLevelFiles: repoContents.filter(item => item.type === 'blob' || item.type === 'tree')
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
