const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'DevGotchi backend',
    uptime: Math.round(process.uptime()),
  });
});

module.exports = router;
