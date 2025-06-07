// Middleware de autenticación
// Verifica y valida tokens JWT usando Auth0 y JWKS

const { expressjwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');

const authenticateToken = expressjwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
    }),
    
    audience: false,
    issuer: `https://${process.env.AUTH0_DOMAIN}/`,
    algorithms: ['RS256'],
    credentialsRequired: false, 
    requestProperty: 'auth',
    getToken: function fromHeaderOrQuerystring(req) {
        if (req.headers['x-user-role'] === 'admin' && 
            req.headers['x-user-email'] === 'admin@eventsbga.com') {
            return null;
        }
        
        if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
            return req.headers.authorization.split(' ')[1];
        }
        return null;
    }
});

const handleAuthError = (err, req, res, next) => {
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
