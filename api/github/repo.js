import { Octokit } from '@octokit/rest';
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const octokit = new Octokit({ auth: process.env.GITHUB_API_KEY });

// Helper function to fetch repository tree structure
const fetchRepoContents = async (owner, repo) => {
    try {
        // Fetch the repository's top-level tree structure (you can change `recursive: true` to fetch full tree)
        const { data } = await octokit.git.getTree({
            owner,
            repo,
            tree_sha: 'HEAD',  // Get the latest tree from the repository's default branch (HEAD)
            recursive: true,   // Fetch the entire tree (set to false if you only need top-level files)
        });

        return data.tree;  // Returns the array of file/directory metadata
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

            // Get README content if it exists
            const readme = repoContents.find(file => file.name.toLowerCase() === 'readme.md');
            let readmeContent = '';
            if (readme) {
                const { data: readmeData } = await octokit.repos.getContent({
                    owner,
                    repo,
                    path: readme.path
                });

                // Decode base64 README content
                readmeContent = Buffer.from(readmeData.content, 'base64').toString();
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
