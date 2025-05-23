/**
 * Middleware para verificar si el usuario tiene los roles permitidos
 * @param {string[]} roles - Array de roles permitidos
 * @returns {Function} Middleware function
 */
const roleCheck = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'No autorizado - Usuario no autenticado'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'No tienes permiso para acceder a este recurso' 
      });
    }
    next();
  };
};

module.exports = roleCheck;
