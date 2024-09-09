import { Octokit } from '@octokit/rest';
import { createClient } from 'redis';
import OpenAI from 'openai';

// Initialize Redis connection
const client = createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
    }
});

client.connect();

const octokit = new Octokit({ auth: process.env.GITHUB_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Function to process repository tree for frontend
const processDataForTreeView = (data) => {
  const buildTree = (items, path = '') => {
    const tree = {};
    items.forEach(item => {
      const parts = item.path.split('/');
      let currentLevel = tree;

      parts.forEach((part, index) => {
        if (!currentLevel[part]) {
          currentLevel[part] = {
            name: part,
            path: parts.slice(0, index + 1).join('/'),
            type: index === parts.length - 1 ? (item.type === 'blob' ? 'file' : 'dir') : 'dir',
            size: item.size,
            sha: item.sha,
            children: {},
          };
        }
        currentLevel = currentLevel[part].children;
      });
    });

    const flattenTree = (node) => {
      const children = Object.values(node.children).map(flattenTree);
      const { children: _, ...nodeWithoutChildren } = node;
      return {
        ...nodeWithoutChildren,
        children: children.length > 0 ? children : undefined,
      };
    };

    return Object.values(tree).map(flattenTree);
  };

  return buildTree(data);
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { owner, repo } = req.query;

    if (!owner || !repo) {
      return res.status(400).json({ message: 'Owner and repo are required.' });
    }

    const taskId = `${owner}/${repo}`;

    try {
      // Fetch repository tree from GitHub
      const response = await octokit.git.getTree({
        owner,
        repo,
        tree_sha: 'HEAD',
        recursive: "1",
      });

      const repoContents = response.data;

      // Log the response to check the structure
      console.log('Repo contents response:', repoContents);

      // Check if tree is available in the response
      if (!repoContents || !repoContents.tree) {
        throw new Error('Repository tree could not be fetched or is empty.');
      }

      // Process repository tree for the frontend
      const treeData = processDataForTreeView(repoContents.tree);

      // Return the tree data to the frontend
      return res.status(200).json({ treeData });

    } catch (error) {
      console.error('Error processing repository:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
}
