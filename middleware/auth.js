const { expressjwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');

// Middleware para verificar el token JWT
const authenticateToken = expressjwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
    }),
    // Configuración para Auth0
    audience: false,
    issuer: `https://${process.env.AUTH0_DOMAIN}/`,
    algorithms: ['RS256'],
    credentialsRequired: false, // Permitir peticiones sin token
    requestProperty: 'auth',
    getToken: function fromHeaderOrQuerystring(req) {
        // Si es una petición del admin, no requerimos token
        if (req.headers['x-user-role'] === 'admin' && 
            req.headers['x-user-email'] === 'admin@eventsbga.com') {
            return null;
        }
        
        // Para otros casos, buscamos el token Bearer
        if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
            return req.headers.authorization.split(' ')[1];
        }
        return null;
    }
});

// Middleware para manejar errores de autenticación
const handleAuthError = (err, req, res, next) => {
    // Si es una petición del admin, permitimos el paso
    if (req.headers['x-user-role'] === 'admin' && 
        req.headers['x-user-email'] === 'admin@eventsbga.com') {
        return next();
    }

    if (err.name === 'UnauthorizedError') {
        console.error('Error de autenticación:', err);
        return res.status(401).json({
            error: 'Token inválido o expirado',
            details: err.message
        });
    }
    next(err);
};

module.exports = { authenticateToken, handleAuthError };
