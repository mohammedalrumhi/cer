const express = require('express');
const { readJson } = require('../utils/fileDb');
const { createAuthToken } = require('../utils/authToken');

const router = express.Router();
const USERS_FILE = 'users.json';
const EMPTY = [];

router.post('/login', (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');

  if (!username || !password) {
    return res.status(400).json({ message: 'اسم المستخدم وكلمة المرور مطلوبان' });
  }

  const users = readJson(USERS_FILE, EMPTY);
  const user = users.find((item) => item.username === username && item.password === password);

  if (!user) {
    return res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }

  const token = createAuthToken(user);

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name || user.username,
    },
  });
});

router.get('/me', (req, res) => {
  const header = String(req.headers.authorization || '');
  if (!header) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  return res.status(501).json({ message: 'Use /login then client-side token session for this basic auth setup' });
});

module.exports = router;
