function getHealth(req, res) {
  res.status(200).json({
    status: 'ok',
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}

module.exports = { getHealth };
