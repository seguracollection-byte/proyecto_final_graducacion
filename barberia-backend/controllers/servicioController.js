const { pool } = require('../config/database');

// Obtener todos los servicios activos para mostrarlos en la app móvil
const getServicios = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM servicios WHERE activo = 1');
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Error al obtener servicios:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// Crear un nuevo servicio (Útil para el panel de administración si lo necesitas)
const createServicio = async (req, res) => {
    const { nombre, descripcion, precio, duracion_minutos } = req.body;

    try {
        const [result] = await pool.query(
            'INSERT INTO servicios (nombre, descripcion, precio, duracion_minutos) VALUES (?, ?, ?, ?)',
            [nombre, descripcion, precio, duracion_minutos || 30]
        );

        res.status(201).json({
            success: true,
            message: 'Servicio creado exitosamente',
            servicioId: result.insertId
        });
    } catch (error) {
        console.error('Error al crear servicio:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

module.exports = {
    getServicios,
    createServicio
};