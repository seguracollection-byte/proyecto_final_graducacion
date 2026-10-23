const express = require('express');
const router = express.Router();
// Importamos correctamente las funciones desde tu controlador
const { getCitas, createCita } = require('../controllers/citaController'); 

// Definimos los endpoints para la raíz de este enrutador
router.get('/', getCitas);
router.post('/', createCita); 

// 🚨 ESTO ES LO QUE NECESITA EXPRESS: Exportar el enrutador puro
module.exports = router;