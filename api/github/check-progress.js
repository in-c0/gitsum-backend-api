// Endpoint to check the status of the repository summary task
export const checkProgress = async (req, res) => {
    if (req.method === 'GET') {
        const { taskId } = req.query;

        if (!taskId || !taskStore[taskId]) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Return the current status of the task
        const taskStatus = taskStore[taskId];

        return res.json({
            status: taskStatus.status,
            summary: taskStatus.status === 'done' ? taskStatus.summary : null,
        });
    } else {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }
};