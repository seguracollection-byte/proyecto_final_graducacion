const express = require('express');
const router = express.Router();
const db = require('../config/database'); // 👈 CAMBIA 'db' POR 'database'

router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM servicios'); 
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener servicios' });
    }
});

module.exports = router;