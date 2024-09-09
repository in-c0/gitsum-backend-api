// this will map to {relativePath}/api/github/test.
export default (req, res) => {
    res.status(200).json({ message: "Test route is working!" });
  };
  