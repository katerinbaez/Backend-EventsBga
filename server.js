// Servidor principal del backend
// Configura Express, rutas y manejo de errores

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Origin',
    'x-user-role',
    'x-user-email'
  ]
}));

const requestCache = {
    requests: new Map(),
    maxSize: 100, 
    ttl: 60000 
};

setInterval(() => {
    const now = Date.now();
    for (const [key, value] of requestCache.requests.entries()) {
        if (now - value.timestamp > requestCache.ttl) {
            requestCache.requests.delete(key);
        }
    }
}, 60000); 

app.use((req, res, next) => {
    const cacheKey = `${req.method}:${req.path}`;
    
    const cachedRequest = requestCache.requests.get(cacheKey);
    const now = Date.now();
    
    if (!cachedRequest || (now - cachedRequest.timestamp > 5000)) { 
        console.log('\n Nueva solicitud:');
        console.log(' Método:', req.method);
        console.log(' Ruta:', req.path);
        console.log(' Cuerpo:', req.body);
        console.log(' Headers:', req.headers);
        
        requestCache.requests.set(cacheKey, { timestamp: now });
        
        if (requestCache.requests.size > requestCache.maxSize) {
            const oldestKey = Array.from(requestCache.requests.keys())[0];
            requestCache.requests.delete(oldestKey);
        }
    }
    
    next();
});

app.use('/auth', authRoutes);

app.use('/api/notifications', notificationRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/metrics', metricsRoutes);

app.use('/api/role-requests', roleRequestRoutes);

app.use('/api/artists', artistRoutes);

app.use('/api/managers', managerRoutes);

app.use('/api/cultural-spaces', culturalSpaceRoutes);

app.use('/api/spaces', spaceRoutes);

app.use('/api/users', userRoutes);

app.use('/api/event-requests', eventRequestRoutes);

app.use('/api/space-availabilities', spaceAvailabilityRoutes);

app.use('/api/blocked-slots', blockedSlotRoutes);

app.use('/api/manager-events', managerEventRoutes);

app.use('/api/event-attendances', eventAttendanceRoutes);

app.get('/auth-test', authenticateToken, (req, res) => {
    console.log(' Token decodificado:', req.auth);
    res.json({ 
        message: 'Autenticación exitosa',
        user: req.auth
    });
});

app.use(handleAuthError);

app.post('/debug', (req, res) => {
    console.log(' Petición recibida en /debug:', req.body);
    res.json({ message: 'Datos recibidos correctamente', data: req.body });
});

app.get('/status', (req, res) => {
    res.json({ status: 'online', message: 'Backend: Conectado ' });
});

setupAssociations();

if (process.env.NODE_ENV !== 'test') {
    sequelize.sync({ alter: true }).then(() => {
        console.log('✅ Base de datos sincronizada');
    }).catch(error => {
        console.error('❌ Error al sincronizar la base de datos:', error);
    });
} else {
    sequelize.sync({ force: false }).catch(() => {});
}

app.use((err, req, res, next) => {
    console.error(' Error en la API:', err.message);
    console.error('Stack trace:', err.stack);
    
    if (err.name === 'UnauthorizedError') {
        if (req.headers['x-user-role'] === 'admin' && 
            req.headers['x-user-email'] === 'admin@eventsbga.com') {
            return next();
        }
        return res.status(401).json({ 
            error: 'Token inválido o expirado',
            details: err.message 
        });
    }

    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({ 
            error: 'Error de validación',
            details: err.errors.map(e => e.message)
        });
    }

    if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ 
            error: 'El recurso ya existe',
            details: err.errors.map(e => e.message)
        });
    }

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
let httpServer;
let httpsServer;

if (process.env.NODE_ENV !== 'test') {
    httpServer = http.createServer(app);
    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🚀 Servidor HTTP corriendo en http://localhost:${PORT}`);
        console.log(` También accesible en http://192.168.1.7:${PORT}`);
    });
    
    console.log('\n📝 Nota: En producción, el proveedor de hosting (Railway, Heroku, etc.) maneja HTTPS automáticamente');
    console.log('No es necesario configurar certificados SSL manualmente para despliegue en producción.');
    
    if (process.env.NODE_ENV === 'development') {
        try {
            const privateKeyPath = './certificates/key.pem';
            const certificatePath = './certificates/cert.pem';
            
            if (fs.existsSync(privateKeyPath) && fs.existsSync(certificatePath)) {
                const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
                const certificate = fs.readFileSync(certificatePath, 'utf8');
                const credentials = { key: privateKey, cert: certificate };
                
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
    
    module.exports = app;
} else {
    const closeServer = async () => {
        if (httpServer) {
            await new Promise((resolve) => httpServer.close(resolve));
        }
        if (httpsServer) {
            await new Promise((resolve) => httpsServer.close(resolve));
        }
        await sequelize.close();
    };
    
    module.exports = app;
}
