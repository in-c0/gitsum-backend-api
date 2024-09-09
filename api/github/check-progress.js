import { createClient } from 'redis';

// Use the redis client
const client = createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST, 
        port: process.env.REDIS_PORT,
    }
});

// Connect to Redis
client.connect();

// Error handling for Redis connection
client.on('error', (err) => {
  console.error('Redis connection error:', err);
});

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { owner, repo } = req.query;

    if (!owner || !repo) {
      return res.status(400).json({ message: 'Owner and repo are required.' });
    }

    const taskId = `${owner}/${repo}`;

    try {
      // Retrieve the task status from Redis
      const taskData = await client.get(taskId);

      if (!taskData) {
        return res.status(404).json({ message: 'Task not found' });
      }

      // Parse the task data from Redis
      const taskStatus = JSON.parse(taskData);

      return res.status(200).json({
        status: taskStatus.status,
        summary: taskStatus.status === 'done' ? taskStatus.summary : null,
      });
    } catch (error) {
      console.error('Error fetching task from Redis:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    // Handle unsupported methods
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
}
