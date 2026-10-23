// controllers/citaController.js
const pool = require('../config/database'); 
// 🌟 IMPORTACIÓN: Traemos el servicio de correos que configuramos antes
const emailService = require('../services/emailService');

// 1. Obtener todas las citas (Corregidas las uniones según el esquema real de MySQL)
const getCitas = async (req, res) => {
    try {
        const query = `
            SELECT 
                c.id AS id,
                c.fecha_hora,
                c.usuarios_id,
                c.barbero_id,
                c.invitado_nombre,
                c.invitado_email,
                c.invitado_telefono,
                s.nombre AS servicio_nombre,
                s.precio AS precio,
                s.descripcion AS servicio_descripcion,
                b.nombre AS barbero_nombre,
                u.nombre AS cliente_registrado_nombre
            FROM citas c
            LEFT JOIN servicios s ON c.servicios_idservicios = s.id
            LEFT JOIN usuarios b ON c.barbero_id = b.id
            LEFT JOIN usuarios u ON c.usuarios_id = u.id
            ORDER BY c.fecha_hora ASC
        `;

        const [rows] = await pool.query(query);

        const citasFormateadas = rows.map(cita => {
            let nombreClienteFinal = 'Cliente Invitado';
            if (cita.cliente_registrado_nombre) {
                nombreClienteFinal = cita.cliente_registrado_nombre;
            } else if (cita.invitado_nombre) {
                nombreClienteFinal = cita.invitado_nombre;
            }

            return {
                id: cita.id,
                fecha_hora: cita.fecha_hora,
                usuarios_id: cita.usuarios_id,
                barbero_id: cita.barbero_id,
                invitado_nombre: cita.invitado_nombre,
                invitado_email: cita.invitado_email,
                invitado_telefono: cita.invitado_telefono,
                
                servicio_nombre: cita.servicio_nombre || 'Servicio no especificado',
                precio: cita.precio || '0.00',
                barbero_nombre: cita.barbero_nombre || 'Barbero no asignado',
                cliente_nombre: nombreClienteFinal, 
                
                es_invitado: !cita.usuarios_id
            };
        });

        res.json({
            success: true,
            data: citasFormateadas
        });
    } catch (error) {
        console.error('❌ Error al obtener o procesar el listado de citas:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// 2. Crear una nueva cita (Invitado o Registrado) con Notificación por Correo
const createCita = async (req, res) => {
    const { 
        fecha_hora,
        servicios_idservicios, 
        barbero_id, 
        usuarios_id, 
        invitado_nombre, 
        invitado_email, 
        invitado_telefono 
    } = req.body;

    try {
        if (!barbero_id || !servicios_idservicios || !fecha_hora) {
            return res.status(400).json({ 
                success: false, 
                message: 'Los campos barbero_id, servicios_idservicios y fecha_hora son obligatorios.' 
            });
        }

        // Insertar la cita en la BD
        const [result] = await pool.query(
            `INSERT INTO citas 
            (fecha_hora, servicios_idservicios, barbero_id, usuarios_id, invitado_nombre, invitado_email, invitado_telefono) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                fecha_hora,
                servicios_idservicios,
                barbero_id,
                usuarios_id || null, 
                invitado_nombre || null, 
                invitado_email || null, 
                invitado_telefono || null
            ]
        );

        const nuevaCitaId = result.insertId;

        // 🌟 MEJORA: Consultamos los datos reales del servicio, barbero y usuario para armar el correo profesional
        const [detalles] = await pool.query(`
            SELECT 
                s.nombre AS servicio_nombre,
                s.precio AS precio,
                b.nombre AS barbero_nombre,
                u.nombre AS usuario_nombre,
                u.email AS usuario_email
            FROM citas c
            LEFT JOIN servicios s ON c.servicios_idservicios = s.id
            LEFT JOIN usuarios b ON c.barbero_id = b.id
            LEFT JOIN usuarios u ON c.usuarios_id = u.id
            WHERE c.id = ?
        `, [nuevaCitaId]);

        if (detalles.length > 0) {
            const infoCita = detalles[0];
            
            // Determinar a quién y qué nombre poner en el correo
            const emailDestino = usuarios_id ? infoCita.usuario_email : invitado_email;
            const nombreCliente = usuarios_id ? infoCita.usuario_nombre : invitado_nombre;
            const tipoCliente = usuarios_id ? "Cliente Registrado" : "Cliente Invitado";

            if (emailDestino) {
                // Estructura HTML elegante con la estética de la barbería
                const cuerpoHtml = `
                    <div style="background-color: #141419; color: #ffffff; padding: 25px; font-family: sans-serif; border-radius: 10px; max-width: 500px; margin: auto; border: 1px solid #d4af37;">
                        <h1 style="color: #d4af37; text-align: center; margin-bottom: 5px;">Pierce Barber Shop</h1>
                        <p style="text-align: center; color: #a0a0a9; font-size: 14px; margin-top: 0;">¡Tu espacio está reservado!</p>
                        <hr style="border-color: #2c2c35;" />
                        
                        <p>Hola <strong>${nombreCliente}</strong>,</p>
                        <p>Confirmamos que tu cita ha sido agendada con éxito. Aquí tienes el resumen de tu reservación en la modalidad de <strong>${tipoCliente}</strong>:</p>
                        
                        <div style="background-color: #1e1e24; padding: 15px; border-radius: 8px; border-left: 4px solid #d4af37; margin: 20px 0;">
                            <p style="margin: 4px 0;">📅 <strong>Fecha y Hora:</strong> ${fecha_hora}</p>
                            <p style="margin: 4px 0;">💈 <strong>Servicio:</strong> ${infoCita.servicio_nombre || 'Servicio de Barbería'}</p>
                            <p style="margin: 4px 0;">✂️ <strong>Barbero:</strong> ${infoCita.barbero_nombre || 'Especialista Asignado'}</p>
                            <p style="margin: 4px 0;">💰 <strong>Precio:</strong> ₡${infoCita.precio || '0.00'}</p>
                        </div>
                        
                        <p style="font-size: 13px; color: #8a8a93; text-align: center; margin-top: 25px;">
                            Recuerda llegar 5 minutos antes. Si necesitas cancelar, avísanos con tiempo.<br/>
                            <strong>Pierce Barber Shop © 2026</strong>
                        </p>
                    </div>
                `;

                // Disparamos el envío asíncrono para no retrasar la respuesta del servidor
                emailService.enviarCorreo(emailDestino, 'Confirmación de tu Cita - Pierce Barber Shop', cuerpoHtml);
            }
        }

        res.status(201).json({
            success: true,
            message: 'Cita agendada exitosamente y notificación enviada.',
            citaId: nuevaCitaId
        });

    } catch (error) {
        console.error('❌ Error real al crear la cita en MariaDB/MySQL:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

module.exports = {
    getCitas,
    createCita
};