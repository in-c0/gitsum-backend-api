import { Octokit } from '@octokit/rest';
import OpenAI from 'openai';
import { createClient } from 'redis';

const redis = createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
    }
});

redis.connect();

const octokit = new Octokit({ auth: process.env.GITHUB_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
    if (req.method === 'GET') {
      const { owner, repo } = req.query;
  
      if (!owner || !repo) {
        return res.status(400).json({ message: 'Owner and repo are required.' });
      }
  
      const taskId = `${owner}/${repo}-summary`;
  
      try {
        // Set headers once before starting the stream
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        // Check if partial summary exists in Redis
        const cachedSummary = await redis.get(taskId);
        if (cachedSummary) {
          res.write(`data: ${cachedSummary}\n\n`);
          res.end();
          return;
        }
  
        // Fetch README content from GitHub
        let readmeContent = '';
        try {
          const { data: readmeData } = await octokit.repos.getReadme({
            owner,
            repo,
            mediaType: { format: 'raw' }
          });
          readmeContent = readmeData;
        } catch (err) {
          console.error('Error fetching README:', err);
          readmeContent = 'README file not available or could not be retrieved.';
        }
  
        // Start OpenAI summary process
        const stream = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant summarizing GitHub repositories making it easy to understand for non-technical users.'
            },
            {
              role: 'user',
              content: `Summarize the following repository: ${owner}/${repo}. 
                      README: ${readmeContent.slice(0, 1000)}`
            }
          ],
          stream: true, // Enable streaming
        });
  
        let summary = '';
        // Process the stream and save each chunk into Redis
        for await (const chunk of stream) {
          if (chunk.choices && chunk.choices[0].delta && chunk.choices[0].delta.content) {
            const sentence = chunk.choices[0].delta.content;
            summary += sentence;
            console.log('Partial Summary:', summary);
  
            // Write the chunk to the client
            res.write(`data: ${sentence}\n\n`);
  
            // Save partial summary to Redis
            await redis.set(taskId, summary);
          }
        }
  
        // Mark the summary as complete
        await redis.set(taskId, summary + " [DONE]");
        res.write(`data: [DONE]\n\n`);
        res.end();
      } catch (error) {
        console.error('Error processing repository summary:', error);
        res.status(500).end();
      }
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
}
