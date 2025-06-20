// Controlador de gestores
// Maneja registro y actualización de perfiles de gestores culturales

const { Manager } = require('../models/Manager');

exports.registerManager = async (req, res) => {
    try {
        const { userId } = req.body;

        const existingManager = await Manager.findOne({ where: { userId } });
        if (existingManager) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un perfil de gestor cultural para este usuario'
            });
        }

        const manager = await Manager.create(req.body);

        res.json({
            success: true,
            message: 'Perfil de gestor cultural creado exitosamente',
            manager
        });
    } catch (error) {
        console.error('Error al registrar gestor:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear el perfil de gestor cultural',
            error: error.message
        });
    }
};

exports.getManagerProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        const manager = await Manager.findOne({ where: { userId } });
        if (!manager) {
            return res.status(404).json({
                success: false,
                message: 'Perfil de gestor cultural no encontrado'
            });
        }

        res.json({
            success: true,
            manager
        });
    } catch (error) {
        console.error('Error al obtener perfil de gestor:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el perfil de gestor cultural',
            error: error.message
        });
    }
};

exports.updateManagerProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        const manager = await Manager.findOne({ where: { userId } });
        if (!manager) {
            return res.status(404).json({
                success: false,
                message: 'Perfil de gestor cultural no encontrado'
            });
        }

        const updateData = { ...req.body };
        
        if (updateData.horarios) {
            if (typeof updateData.horarios === 'string') {
                try {
                    updateData.horarios = JSON.parse(updateData.horarios);
                } catch (e) {
                    console.error('Error al parsear horarios:', e);
                }
            }
            
            if (typeof updateData.horarios !== 'object') {
                updateData.horarios = {
                    lunes: '',
                    martes: '',
                    miercoles: '',
                    jueves: '',
                    viernes: '',
                    sabado: '',
                    domingo: ''
                };
            }
            
            console.log('Horarios a guardar:', JSON.stringify(updateData.horarios));
        }

        await manager.update(updateData);

        res.json({
            success: true,
            message: 'Perfil actualizado exitosamente',
            manager
        });
    } catch (error) {
        console.error('Error al actualizar perfil de gestor:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el perfil',
            error: error.message
        });
    }
};

exports.getManagers = async (req, res) => {
    try {
        const managers = await Manager.findAll();
        
        res.json({
            success: true,
            managers
        });
    } catch (error) {
        console.error('Error al obtener gestores culturales:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la lista de gestores culturales',
            error: error.message
        });
    }
};

exports.deleteManagerProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        const manager = await Manager.findOne({ where: { userId } });
        if (!manager) {
            return res.status(404).json({
                success: false,
                message: 'Perfil de gestor cultural no encontrado'
            });
        }

        await manager.destroy();

        res.json({
            success: true,
            message: 'Perfil de gestor cultural eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error al eliminar perfil de gestor:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el perfil de gestor cultural',
            error: error.message
        });
    }
};
