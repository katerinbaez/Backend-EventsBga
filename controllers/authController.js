const { User } = require('../models/User');

exports.login = async (req, res) => {
    try {
        console.log("🔹 Datos recibidos en req.body:", req.body);

        // Obtener los datos del usuario
        const { sub, email, name } = req.body;

        if (!sub || !email) {
            return res.status(400).json({ error: 'Faltan datos obligatorios' });
        }

        let user = await User.findOne({ where: { email } });

        // Si el usuario no existe, créalo
        if (!user) {
            user = await User.create({ 
                id: sub, 
                email, 
                name,
                role: email === 'admin@eventsbga.com' ? 'admin' : 'user'
            });
            console.log('✅ Usuario registrado:', user);
        } else {
            // Si el usuario existe, actualiza sus datos
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
