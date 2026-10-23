// controllers/authController.js
// Importación directa del pool sin llaves (adaptado a tu config/database.js limpio)
const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // Nativo de Node.js para strings seguros
const { enviarCorreo } = require('../services/emailService'); // Importamos tu servicio de correo

const register = async (req, res) => {
    const { nombre, email, telefono, password, rol } = req.body;

    try {
        // Verificar si el correo ya existe
        const [existingUser] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ success: false, message: 'El correo electrónico ya está registrado' });
        }

        // Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userRol = rol || 'cliente';
        const [result] = await pool.query(
            'INSERT INTO usuarios (nombre, email, telefono, password, rol) VALUES (?, ?, ?, ?, ?)',
            [nombre, email, telefono, hashedPassword, userRol]
        );

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            userId: result.insertId
        });

    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Buscar al usuario por correo usando el pool directo
        const [users] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(400).json({ success: false, message: 'Credenciales inválidas' });
        }

        const user = users[0];

        // 2. Verificar que la contraseña coincida con el hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Credenciales inválidas' });
        }

        // 3. Generar el Token JWT conteniendo su ID y su Rol
        const token = jwt.sign(
            { id: user.id, rol: user.rol },
            process.env.JWT_SECRET, 
            { expiresIn: '8h' }
        );

        // Imprimir en la consola de Node para depuración en vivo
        console.log(`🔑 LOGIN EXITOSO -> Usuario: ${user.nombre} | Rol BD: ${user.rol}`);

        // 4. Responder garantizando que los datos limpios se envíen de manera explícita
        return res.status(200).json({
            success: true,
            message: 'Login exitoso',
            token: token,
            user: {
                id: Number(user.id),
                nombre: String(user.nombre),
                email: String(user.email),
                rol: String(user.rol).toLowerCase().trim() // Lo mandamos limpio y en minúsculas
            }
        });

    } catch (error) {
        console.error('❌ Error real en el proceso de login en Node:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// 🌟 NUEVO ENDPOINT: Recuperar Contraseña por Correo Electrónico Real
const recuperarPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'El correo electrónico es requerido.' });
    }

    try {
        // 1. Verificar si el usuario existe en la tabla de la Base de Datos
        const [usuarios] = await pool.query('SELECT id, nombre, email FROM usuarios WHERE email = ?', [email.trim()]);

        if (!usuarios || usuarios.length === 0) {
            return res.status(404).json({ success: false, message: 'No existe ningún usuario registrado con ese correo electrónico.' });
        }

        const usuario = usuarios[0];

        // 2. Generar una clave temporal segura de 8 caracteres alfanuméricos
        const nuevaContrasenaTemporal = crypto.randomBytes(4).toString('hex').toUpperCase();

        // 3. Encriptar la nueva contraseña temporal antes de actualizar la Base de Datos
        const salt = await bcrypt.genSalt(10);
        const hashedPasswordTemporal = await bcrypt.hash(nuevaContrasenaTemporal, salt);

        // 4. Actualizar la base de datos con la clave encriptada temporal
        await pool.query('UPDATE usuarios SET password = ? WHERE id = ?', [hashedPasswordTemporal, usuario.id]);

        // 5. Maquetar el cuerpo HTML elegante y consistente con Pierce Barber Shop
        const cuerpoHtml = `
            <div style="font-family: sans-serif; background-color: #141419; color: #ffffff; padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto; border: 1px solid #d4af37;">
                <h2 style="color: #d4af37; text-align: center; margin-bottom: 20px;">Pierce Barber Shop</h2>
                <p style="font-size: 16px; color: #ffffff;">Hola, <strong>${usuario.nombre}</strong>.</p>
                <p style="font-size: 14px; color: #a0a0a9;">Hemos recibido una solicitud para restablecer el acceso a tu cuenta de la barbería.</p>
                
                <div style="background-color: #1e1e24; border: 1px dashed #d4af37; padding: 15px; text-align: center; margin: 25px 0; border-radius: 8px;">
                    <span style="font-size: 13px; color: #aaa; display: block; margin-bottom: 5px;">TU NUEVA CONTRASEÑA TEMPORAL</span>
                    <strong style="font-size: 24px; color: #d4af37; letter-spacing: 2px;">${nuevaContrasenaTemporal}</strong>
                </div>

                <p style="font-size: 13px; color: #ff6b6b; text-align: center;">⚠️ Por motivos de seguridad, te recomendamos iniciar sesión con esta clave de inmediato y actualizarla en tu perfil.</p>
                
                <hr style="border: 0; border-top: 1px solid #2c2c35; margin-top: 30px;" />
                <p style="font-size: 11px; color: #8a8a93; text-align: center; margin-top: 15px;">Pierce Barber Shop — Sistema de Agenda Web/Mobile</p>
            </div>
        `;

        // 6. Enviar el correo usando el emailService
        const correoResultado = await enviarCorreo(email.trim(), 'Restablecer Contraseña - Pierce Barber Shop', cuerpoHtml);

        if (correoResultado.success) {
            return res.status(200).json({ success: true, message: 'Se ha enviado una contraseña temporal a tu correo electrónico real.' });
        } else {
            return res.status(500).json({ success: false, message: 'Error interno al enviar el correo a través del servidor SMTP.', error: correoResultado.error });
        }

    } catch (error) {
        console.error('❌ Error crítico en el servidor al recuperar contraseña:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor en el proceso de recuperación.' });
    }
};

// 🔑 NUEVA FUNCIÓN: Actualización directa de contraseña en la Base de Datos
const updatePassword = async (req, res) => {
    const { id, password } = req.body;

    if (!id || !password) {
        return res.status(400).json({ success: false, message: 'Faltan datos obligatorios (ID o Contraseña).' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await pool.query('UPDATE usuarios SET password = ? WHERE id = ?', [hashedPassword, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        return res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente.' });
    } catch (error) {
        console.error('❌ Error al actualizar la contraseña:', error);
        return res.status(500).json({ success: false, message: 'Error interno al actualizar la contraseña.' });
    }
};

module.exports = {
    register,
    login,
    recuperarPassword,
    updatePassword
};