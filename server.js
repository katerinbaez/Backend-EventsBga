require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const https = require('https');
const fs = require('fs');
const sequelize = require('./config/database');
const authRoutes = require('./routes/auth.routes');
const notificationRoutes = require('./routes/notificationRoutes');
const favoriteRoutes = require('./routes/favorite.routes');
const eventRoutes = require('./routes/event.routes');
const categoryRoutes = require('./routes/category.routes');
const metricsRoutes = require('./routes/metrics.routes');
const roleRequestRoutes = require('./routes/roleRequest');
const artistRoutes = require('./routes/artistRoutes');
const managerRoutes = require('./routes/managerRoutes');
const culturalSpaceRoutes = require('./routes/culturalSpace.routes');
const spaceRoutes = require('./routes/space.routes');
const userRoutes = require('./routes/user.routes');
const eventRequestRoutes = require('./routes/eventRequest.routes');
const spaceAvailabilityRoutes = require('./routes/spaceAvailability.routes');
const blockedSlotRoutes = require('./routes/blockedSlot.routes');
const managerEventRoutes = require('./routes/managerEvent.routes');
const eventAttendanceRoutes = require('./routes/eventAttendance.routes');
const { authenticateToken, handleAuthError } = require('./middleware/auth');
const { setupAssociations } = require('./models/associations');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware para parsear JSON y datos de formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar servidor para servir archivos estáticos (imágenes)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuración de CORS con headers personalizados
app.use(cors({
  origin: '*', // Permite cualquier origen porque la app móvil no está limitada por CORS
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Origin',
    'x-user-role',
    'x-user-email'
  ]
  // NO uses credentials: true si usas origin: '*'
}));

// Caché para evitar logs repetitivos
const requestCache = {
    requests: new Map(),
    maxSize: 100, // Tamaño máximo de la caché
    ttl: 60000 // Tiempo de vida de 1 minuto para cada entrada
};

// Función para limpiar entradas antiguas de la caché
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of requestCache.requests.entries()) {
        if (now - value.timestamp > requestCache.ttl) {
            requestCache.requests.delete(key);
        }
    }
}, 60000); // Limpiar cada minuto

// Middleware para registrar todas las solicitudes (evitando repeticiones)
app.use((req, res, next) => {
    // Crear una clave única para esta solicitud
    const cacheKey = `${req.method}:${req.path}`;
    
    // Verificar si esta solicitud ya se ha registrado recientemente
    const cachedRequest = requestCache.requests.get(cacheKey);
    const now = Date.now();
    
    // Solo registrar si es una nueva solicitud o ha pasado suficiente tiempo desde la última vez
    if (!cachedRequest || (now - cachedRequest.timestamp > 5000)) { // 5 segundos entre logs de la misma ruta
        console.log('\n Nueva solicitud:');
        console.log(' Método:', req.method);
        console.log(' Ruta:', req.path);
        console.log(' Cuerpo:', req.body);
        console.log(' Headers:', req.headers);
        
        // Actualizar la caché
        requestCache.requests.set(cacheKey, { timestamp: now });
        
        // Limitar el tamaño de la caché
        if (requestCache.requests.size > requestCache.maxSize) {
            // Eliminar la entrada más antigua
            const oldestKey = Array.from(requestCache.requests.keys())[0];
            requestCache.requests.delete(oldestKey);
        }
    }
    
    next();
});

// Rutas de autenticación
app.use('/auth', authRoutes);

// Rutas de la API
app.use('/api/notifications', notificationRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/metrics', metricsRoutes);

// Para las rutas de role-requests
app.use('/api/role-requests', roleRequestRoutes);

// Rutas de artistas
app.use('/api/artists', artistRoutes);

// Rutas de gestores culturales
app.use('/api/managers', managerRoutes);

// Rutas de espacios culturales
app.use('/api/cultural-spaces', culturalSpaceRoutes);

// Rutas para gestión de espacios y horarios
app.use('/api/spaces', spaceRoutes);

// Rutas de usuarios
app.use('/api/users', userRoutes);

// Rutas para solicitudes de eventos
app.use('/api/event-requests', eventRequestRoutes);

// Rutas para disponibilidad de espacios
app.use('/api/space-availabilities', spaceAvailabilityRoutes);

// Rutas para horarios bloqueados
app.use('/api/blocked-slots', blockedSlotRoutes);

// Rutas para eventos creados por gestores
app.use('/api/manager-events', managerEventRoutes);

// Rutas para asistencias a eventos
app.use('/api/event-attendances', eventAttendanceRoutes);

// Ruta de prueba de autenticación
app.get('/auth-test', authenticateToken, (req, res) => {
    console.log(' Token decodificado:', req.auth);
    res.json({ 
        message: 'Autenticación exitosa',
        user: req.auth
    });
});

// Middleware de manejo de errores de autenticación
app.use(handleAuthError);

// Ruta de prueba
app.post('/debug', (req, res) => {
    console.log(' Petición recibida en /debug:', req.body);
    res.json({ message: 'Datos recibidos correctamente', data: req.body });
});

// Ruta de estado del servidor
app.get('/status', (req, res) => {
    res.json({ status: 'online', message: 'Backend: Conectado ' });
});

// Configurar asociaciones
setupAssociations();

// Sincronizar base de datos solo si no estamos en modo de prueba
if (process.env.NODE_ENV !== 'test') {
    sequelize.sync({ alter: true }).then(() => {
        console.log('✅ Base de datos sincronizada');
    }).catch(error => {
        console.error('❌ Error al sincronizar la base de datos:', error);
    });
} else {
    // En modo de prueba, usamos una sincronización más simple y sin logging
    sequelize.sync({ force: false }).catch(() => {});
}

// Middleware de manejo de errores
app.use((err, req, res, next) => {
    console.error(' Error en la API:', err.message);
    console.error('Stack trace:', err.stack);
    
    // Errores de autenticación
    if (err.name === 'UnauthorizedError') {
        // Si es admin, permitimos el paso
        if (req.headers['x-user-role'] === 'admin' && 
            req.headers['x-user-email'] === 'admin@eventsbga.com') {
            return next();
        }
        return res.status(401).json({ 
            error: 'Token inválido o expirado',
            details: err.message 
        });
    }

    // Error de validación de Sequelize
    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({ 
            error: 'Error de validación',
            details: err.errors.map(e => e.message)
        });
    }

    // Error único de Sequelize (e.g., email duplicado)
    if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ 
            error: 'El recurso ya existe',
            details: err.errors.map(e => e.message)
        });
    }

    // Error general
    res.status(500).json({ 
        error: 'Error interno del servidor',
        details: err.message
    });
});

/*Iniciar servidor solo si no estamos en modo de prueba
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
        console.log(` También accesible en http://192.168.1.7:${PORT}`);
    });
}
*/
// Crear servidores HTTP y HTTPS que podamos cerrar durante las pruebas
let httpServer;
let httpsServer;

// Si no estamos en modo de prueba, iniciar los servidores normalmente
if (process.env.NODE_ENV !== 'test') {
    // Iniciar servidor HTTP
    httpServer = http.createServer(app);
    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🚀 Servidor HTTP corriendo en http://localhost:${PORT}`);
        console.log(` También accesible en http://192.168.1.7:${PORT}`);
    });
    
    // En producción (Railway, Heroku, etc.), estos servicios manejan HTTPS automáticamente
    // No necesitamos configurar HTTPS manualmente, ya que el proveedor de hosting lo hace por nosotros
    console.log('\n📝 Nota: En producción, el proveedor de hosting (Railway, Heroku, etc.) maneja HTTPS automáticamente');
    console.log('No es necesario configurar certificados SSL manualmente para despliegue en producción.');
    
    // Si estamos en desarrollo local y queremos probar con HTTPS
    if (process.env.NODE_ENV === 'development') {
        try {
            // Ruta a los certificados (debes crearlos primero)
            const privateKeyPath = './certificates/key.pem';
            const certificatePath = './certificates/cert.pem';
            
            // Verificar si existen los certificados
            if (fs.existsSync(privateKeyPath) && fs.existsSync(certificatePath)) {
                const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
                const certificate = fs.readFileSync(certificatePath, 'utf8');
                const credentials = { key: privateKey, cert: certificate };
                
                // Crear servidor HTTPS
                httpsServer = https.createServer(credentials, app);
                const HTTPS_PORT = process.env.HTTPS_PORT || 5443;
                
                httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
                    console.log(`🔒 Servidor HTTPS corriendo en https://localhost:${HTTPS_PORT}`);
                    console.log(` También accesible en https://192.168.1.7:${HTTPS_PORT}`);
                });
            }
        } catch (error) {
            console.error('❌ Error al iniciar servidor HTTPS:', error.message);
        }
    }
    
    // Exportar solo la aplicación en modo normal
    module.exports = app;
} else {
    // En modo de prueba, exportamos la aplicación y la función para cerrar
    
    // Función para cerrar los servidores y las conexiones
    const closeServer = async () => {
        if (httpServer) {
            await new Promise((resolve) => httpServer.close(resolve));
        }
        if (httpsServer) {
            await new Promise((resolve) => httpsServer.close(resolve));
        }
        await sequelize.close();
    };
    
    // Exportar la aplicación para pruebas
    module.exports = app;
}
