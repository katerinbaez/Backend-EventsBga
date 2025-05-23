const { User } = require('../models/User');
const { RoleRequest } = require('../models/RoleRequest');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

// Obtener todos los usuarios con sus roles correctos
exports.getAllUsers = async (req, res) => {
  try {
    // Obtener todos los usuarios
    const users = await User.findAll({
      attributes: { exclude: ['password'] } // Excluir contraseña por seguridad
    });
    
    // Obtener todas las solicitudes de rol aprobadas
    const approvedRoleRequests = await RoleRequest.findAll({
      where: {
        estado: 'Aprobado'
      }
    });
    
    // Crear un mapa de userId -> rolSolicitado para búsquedas rápidas
    const approvedRolesMap = {};
    approvedRoleRequests.forEach(request => {
      approvedRolesMap[request.userId] = request.rolSolicitado;
    });
    
    // Actualizar los roles de los usuarios según las solicitudes aprobadas
    const usersWithCorrectRoles = users.map(user => {
      const userData = user.toJSON();
      
      // Si el usuario tiene una solicitud de rol aprobada, actualizar su rol
      if (approvedRolesMap[userData.id]) {
        const approvedRole = approvedRolesMap[userData.id];
        
        // Convertir el rolSolicitado al formato correcto para el frontend
        if (approvedRole === 'Artista') {
          userData.role = 'artist';
        } else if (approvedRole === 'GestorEventos') {
          userData.role = 'manager';
        }
      } else {
        // Si no tiene solicitud aprobada, asegurarse de que sea 'user'
        // a menos que ya sea 'admin'
        if (userData.role !== 'admin') {
          userData.role = 'user';
        }
      }
      
      return userData;
    });
    
    res.json(usersWithCorrectRoles);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

// Obtener un usuario por ID con su rol correcto
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] } // Excluir contraseña por seguridad
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const userData = user.toJSON();
    
    // Verificar si el usuario tiene una solicitud de rol aprobada
    const approvedRoleRequest = await RoleRequest.findOne({
      where: {
        userId: userData.id,
        estado: 'Aprobado'
      }
    });
    
    // Actualizar el rol según la solicitud aprobada
    if (approvedRoleRequest) {
      if (approvedRoleRequest.rolSolicitado === 'Artista') {
        userData.role = 'artist';
      } else if (approvedRoleRequest.rolSolicitado === 'GestorEventos') {
        userData.role = 'manager';
      }
    } else {
      // Si no tiene solicitud aprobada, asegurarse de que sea 'user'
      // a menos que ya sea 'admin'
      if (userData.role !== 'admin') {
        userData.role = 'user';
      }
    }
    
    res.json(userData);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
};

// Actualizar un usuario (solo rol)
exports.updateUser = async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;
    
    // Verificar si el usuario existe
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Verificar si el usuario tiene una solicitud de rol aprobada
    const approvedRoleRequest = await RoleRequest.findOne({
      where: {
        userId: userId,
        estado: 'Aprobado'
      }
    });
    
    // Determinar el rol correcto
    let correctRole = role;
    
    // Si el rol que se intenta asignar es 'artist' o 'manager', verificar que tenga la solicitud aprobada
    if (role === 'artist' || role === 'manager') {
      if (approvedRoleRequest) {
        const approvedRole = approvedRoleRequest.rolSolicitado;
        
        // Verificar que el rol solicitado coincida con el rol que se intenta asignar
        if ((role === 'artist' && approvedRole !== 'Artista') || 
            (role === 'manager' && approvedRole !== 'GestorEventos')) {
          // Si no coincide, usar el rol aprobado o 'user'
          if (approvedRole === 'Artista') {
            correctRole = 'artist';
          } else if (approvedRole === 'GestorEventos') {
            correctRole = 'manager';
          } else {
            correctRole = 'user';
          }
        }
      } else {
        // Si no tiene solicitud aprobada, no puede ser artista ni gestor
        correctRole = 'user';
      }
    }
    
    // Actualizar SOLO el rol del usuario
    await user.update({
      role: correctRole
    });
    
    // Devolver usuario actualizado sin contraseña
    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });
    
    // Verificar nuevamente el rol correcto para la respuesta
    const userData = updatedUser.toJSON();
    
    // Si tiene solicitud aprobada, asegurarse de que el rol sea el correcto
    if (approvedRoleRequest) {
      if (approvedRoleRequest.rolSolicitado === 'Artista') {
        userData.role = 'artist';
      } else if (approvedRoleRequest.rolSolicitado === 'GestorEventos') {
        userData.role = 'manager';
      }
    } else if (userData.role !== 'admin') {
      // Si no tiene solicitud aprobada y no es admin, debe ser user
      userData.role = 'user';
    }
    
    res.json(userData);
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

// Eliminar un usuario
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Verificar si el usuario existe
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Eliminar usuario
    await user.destroy();
    
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
};

// Cambiar contraseña de usuario (con bcryptjs)
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.params.id;
    
    // Verificar si el usuario existe
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Verificar contraseña actual
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    }
    
    // Encriptar nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Actualizar contraseña
    await user.update({ password: hashedPassword });
    
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
};

// Crear un nuevo usuario
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Verificar si el correo ya está registrado
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }
    
    // Generar un ID único usando timestamp y número aleatorio
    const timestamp = new Date().getTime();
    const randomNum = Math.floor(Math.random() * 10000);
    const userId = `user_${timestamp}_${randomNum}`;
    
    // Crear nuevo usuario con ID generado
    // Nota: No incluimos password ni role ya que Auth0 maneja la autenticación
    const newUser = await User.create({
      id: userId,
      name,
      email
    });
    
    // Devolver usuario creado
    const createdUser = await User.findByPk(newUser.id);
    
    res.status(201).json(createdUser);
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};
