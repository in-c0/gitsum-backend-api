import { Octokit } from '@octokit/rest';
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const octokit = new Octokit({ auth: process.env.GITHUB_API_KEY });

export const taskStore = {}; // Initialize task store to keep track of progress

// Helper function to fetch repository tree structure
const fetchRepoContents = async (owner, repo) => {
    try {
        const { data } = await octokit.git.getTree({
            owner,
            repo,
            tree_sha: 'HEAD',
            recursive: false,  // Fetch only the top-level directory
        });

        return data.tree.filter(item => item.path === 'README.md' || item.path === 'package.json');  // Filter key files
    } catch (error) {
        console.error('Error fetching repository contents:', error);
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

        // Create a unique task ID (e.g., based on repo name and owner)
        const taskId = `${owner}/${repo}`;
        taskStore[taskId] = { status: "Looking for key files..." };

        try {
            // Step 1: Fetch the repository contents from GitHub
            const repoContents = await fetchRepoContents(owner, repo);
            taskStore[taskId].status = "Reading key files...";

            // Find the README.md file and fetch its content
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

            taskStore[taskId].status = "Summarizing with ChatGPT 4...";

            // Step 2: Generate summary using OpenAI (truncate README for faster response)
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
            taskStore[taskId].summary = summary;
            taskStore[taskId].status = "done";

            return res.json({ taskId });
        } catch (error) {
            console.error('Error in /api/github/repo:', error);
            taskStore[taskId].status = "error";
            return res.status(500).json({ message: 'Internal server error' });
        }
    } else {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }
};
