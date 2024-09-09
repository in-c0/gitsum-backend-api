import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL); // Use the same Redis instance

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { owner, repo } = req.query;

    if (!owner || !repo) {
      return res.status(400).json({ message: 'Owner and repo are required.' });
    }

    const taskId = `${owner}/${repo}`;

    // Retrieve the task status from Redis
    const taskData = await redis.get(taskId);

    if (!taskData) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Parse the task data from Redis
    const taskStatus = JSON.parse(taskData);

    return res.status(200).json({
      status: taskStatus.status,
      summary: taskStatus.status === 'done' ? taskStatus.summary : null,
    });
  } else {
    // Handle unsupported methods
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
}
