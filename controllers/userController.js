// Controlador de usuarios
// Maneja la autenticación, registro y gestión de usuarios del sistema

const { User } = require('../models/User');
const { RoleRequest } = require('../models/RoleRequest');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] }
    });
    
    const approvedRoleRequests = await RoleRequest.findAll({
      where: {
        estado: 'Aprobado'
      }
    });
    
    const approvedRolesMap = {};
    approvedRoleRequests.forEach(request => {
      approvedRolesMap[request.userId] = request.rolSolicitado;
    });
    
    const usersWithCorrectRoles = users.map(user => {
      const userData = user.toJSON();
      
      if (approvedRolesMap[userData.id]) {
        const approvedRole = approvedRolesMap[userData.id];
        
        if (approvedRole === 'Artista') {
          userData.role = 'artist';
        } else if (approvedRole === 'GestorEventos') {
          userData.role = 'manager';
        }
      } else {
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

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const userData = user.toJSON();
    
    const approvedRoleRequest = await RoleRequest.findOne({
      where: {
        userId: userData.id,
        estado: 'Aprobado'
      }
    });
    
    if (approvedRoleRequest) {
      if (approvedRoleRequest.rolSolicitado === 'Artista') {
        userData.role = 'artist';
      } else if (approvedRoleRequest.rolSolicitado === 'GestorEventos') {
        userData.role = 'manager';
      }
    } else {
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

exports.updateUser = async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const approvedRoleRequest = await RoleRequest.findOne({
      where: {
        userId: userId,
        estado: 'Aprobado'
      }
    });
    
    let correctRole = role;
    
    if (role === 'artist' || role === 'manager') {
      if (approvedRoleRequest) {
        const approvedRole = approvedRoleRequest.rolSolicitado;
        
        if ((role === 'artist' && approvedRole !== 'Artista') || 
            (role === 'manager' && approvedRole !== 'GestorEventos')) {
          if (approvedRole === 'Artista') {
            correctRole = 'artist';
          } else if (approvedRole === 'GestorEventos') {
            correctRole = 'manager';
          } else {
            correctRole = 'user';
          }
        }
      } else {
        correctRole = 'user';
      }
    }
    
    await user.update({
      role: correctRole
    });
    
    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });
    
    const userData = updatedUser.toJSON();
    
    if (approvedRoleRequest) {
      if (approvedRoleRequest.rolSolicitado === 'Artista') {
        userData.role = 'artist';
      } else if (approvedRoleRequest.rolSolicitado === 'GestorEventos') {
        userData.role = 'manager';
      }
    } else if (userData.role !== 'admin') {
      userData.role = 'user';
    }
    
    res.json(userData);
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    await user.destroy();
    
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.params.id;
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    await user.update({ password: hashedPassword });
    
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }
    
    const timestamp = new Date().getTime();
    const randomNum = Math.floor(Math.random() * 10000);
    const userId = `user_${timestamp}_${randomNum}`;
    
    const newUser = await User.create({
      id: userId,
      name,
      email
    });
    
    const createdUser = await User.findByPk(newUser.id);
    
    res.status(201).json(createdUser);
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};
