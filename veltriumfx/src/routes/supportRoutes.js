const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');

// Support AI chatbot route
router.post('/chat', supportController.chat);

module.exports = router;
