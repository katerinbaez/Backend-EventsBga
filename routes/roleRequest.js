// Rutas de solicitudes de roles
// Gestiona la creación y gestión de solicitudes de roles de usuario

const express = require('express');
const router = express.Router();
const { RoleRequest } = require('../models/RoleRequest');
const { User } = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { Op } = require('sequelize');

router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('Cuerpo de la solicitud:', req.body);
    console.log('Usuario autenticado:', req.auth);
    
    const { userId, rolSolicitado, justificacion, trayectoriaArtistica, portafolio, 
            experienciaGestion, espacioCultural, licencias, documentos } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'Se requiere el ID del usuario' });
    }

    const processedPortafolio = Array.isArray(portafolio) ? portafolio : [];
    const processedDocumentos = Array.isArray(documentos) ? documentos : [];

    const roleRequest = await RoleRequest.create({
      userId,
      rolSolicitado,
      justificacion,
      trayectoriaArtistica,
      portafolio: processedPortafolio,
      experienciaGestion,
      espacioCultural,
      licencias,
      documentos: processedDocumentos,
      estado: 'Pendiente'
    });
    
    res.status(201).json(roleRequest);
  } catch (error) {
    console.error('Error al crear solicitud:', error);
    res.status(500).json({ message: 'Error al crear la solicitud' });
  }
});

router.get('/', async (req, res) => {
  try {
    console.log('Headers recibidos:', req.headers);
    
    const isAdmin = req.headers['x-user-role'] === 'admin' && 
                   req.headers['x-user-email'] === 'admin@eventsbga.com';

    if (!isAdmin) {
      console.log('❌ Acceso denegado. Headers:', req.headers);
      return res.status(403).json({ message: 'No autorizado' });
    }

    console.log('✅ Admin verificado, buscando solicitudes...');
    
    const requests = await RoleRequest.findAll({
      include: [{
        model: User,
        as: 'User',
        attributes: ['name'],
        required: false
      }],
      order: [['createdAt', 'DESC']]
    });

    requests.forEach(request => {
      const plainRequest = request.get({ plain: true });
      console.log('Solicitud:', {
        id: plainRequest.id,
        userId: plainRequest.userId,
        documentos: plainRequest.documentos,
        portafolio: plainRequest.portafolio
      });
    });

    const formattedRequests = requests.map(request => {
      const plainRequest = request.get({ plain: true });
      
      const documentos = plainRequest.documentos || [];
      const portafolio = plainRequest.portafolio || [];

      const processedDocumentos = Array.isArray(documentos) ? 
        documentos : 
        Object.entries(documentos).map(([key, value]) => value);

      return {
        ...plainRequest,
        userId: plainRequest.userId,
        userName: plainRequest.User ? plainRequest.User.name : plainRequest.userId,
        documentos: processedDocumentos,
        portafolio: Array.isArray(portafolio) ? portafolio : [],
        User: undefined
      };
    });

    console.log('Solicitudes formateadas:', JSON.stringify(formattedRequests, null, 2));
    res.json(formattedRequests);
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ 
      message: 'Error al obtener las solicitudes',
      error: error.message 
    });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const requests = await RoleRequest.findAll({
      where: { userId: req.auth.id },
      order: [['createdAt', 'DESC']]
    });

    res.json(requests);
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ message: 'Error al obtener las solicitudes' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const isAdmin = req.headers['x-user-role'] === 'admin' && 
                   req.headers['x-user-email'] === 'admin@eventsbga.com';

    if (!isAdmin) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const { id } = req.params;
    const { estado } = req.body;

    const roleRequest = await RoleRequest.findByPk(id);
    if (!roleRequest) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    roleRequest.estado = estado;
    await roleRequest.save();

    if (estado === 'Aprobado') {
      const user = await User.findByPk(roleRequest.userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      user.role = roleRequest.rolSolicitado;
      await user.save();

      console.log(`Rol actualizado para usuario ${user.id} a ${user.role}`);
    }

    res.json(roleRequest);
  } catch (error) {
    console.error('Error al actualizar solicitud:', error);
    res.status(500).json({ 
      message: 'Error al actualizar la solicitud',
      error: error.message 
    });
  }
});

module.exports = router;
