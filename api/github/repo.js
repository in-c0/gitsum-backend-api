import { createClient } from 'redis';

const client = createClient({
    
    password: process.env.client_PASSWORD,
    socket: {
        host: process.env.client_HOST, 
        port: process.env.client_PORT,
    }
});

// Connect to client
client.connect();

// Error handling for client connection
client.on('error', (err) => {
  console.error('client connection error:', err);
});


// Export the handler
export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { owner, repo } = req.query;

    if (!owner || !repo) {
      return res.status(400).json({ message: 'Owner and repo are required.' });
    }

    const taskId = `${owner}/${repo}`;

    try {
      const taskData = await client.get(taskId);

      if (!taskData) {
        return res.status(404).json({ message: 'Task not found' });
      }

      const taskStatus = JSON.parse(taskData);

      return res.status(200).json({
        status: taskStatus.status,
        summary: taskStatus.status === 'done' ? taskStatus.summary : null,
      });
    } catch (error) {
      console.error('Error fetching task from client:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    // Handle unsupported methods
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
}
