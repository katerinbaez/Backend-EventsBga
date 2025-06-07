// Controlador de autenticación
// Maneja el inicio de sesión y registro de usuarios

const { User } = require('../models/User');

exports.login = async (req, res) => {
    try {
        console.log("🔹 Datos recibidos en req.body:", req.body);

        const { sub, email, name } = req.body;

        if (!sub || !email) {
            return res.status(400).json({ error: 'Faltan datos obligatorios' });
        }

        let user = await User.findOne({ where: { email } });

        if (!user) {
            user = await User.create({ 
                id: sub, 
                email, 
                name,
                role: email === 'admin@eventsbga.com' ? 'admin' : 'user'
            });
            console.log('✅ Usuario registrado:', user);
        } else {
            await user.update({ 
                name,
                role: email === 'admin@eventsbga.com' ? 'admin' : user.role
            });
            console.log('⚠️ Usuario actualizado:', user);
        }

        res.json({ user });
    } catch (error) {
        console.error('❌ Error en la autenticación:', error);
        res.status(500).json({ error: 'Error en la autenticación' });
    }
};
