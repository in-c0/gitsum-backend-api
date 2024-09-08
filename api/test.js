// this will map to {relativePath}/api/github/test.
module.exports = (req, res) => {
    res.status(200).json({ message: "Test route is working!" });
  };
  