// Import the task store from where the repository job progress is being tracked
import { taskStore } from './repo'; // Make sure taskStore is accessible and defined

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { owner, repo } = req.query;

    if (!owner || !repo) {
      return res.status(400).json({ message: 'Owner and repo are required.' });
    }

    const taskId = `${owner}/${repo}`;
    
    // Check if taskId exists in the task store
    if (!taskStore[taskId]) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Return the current progress status of the task
    const taskStatus = taskStore[taskId];
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
