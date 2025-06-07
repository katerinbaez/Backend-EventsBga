// Controlador de espacios culturales
// Maneja la gestión de espacios, horarios y bloques de tiempo

const { Manager } = require('../models/Manager');
const { Event } = require('../models/Event');

const SpaceAvailability = require('../models/SpaceAvailability');
const BlockedSlot = require('../models/BlockedSlot');

exports.getSpaceByManagerId = async (req, res) => {
  try {
    const { managerId } = req.params;

    const manager = await Manager.findOne({ where: { userId: managerId } });
    if (!manager) {
      return res.status(404).json({ success: false, message: 'Espacio cultural no encontrado' });
    }

    return res.status(200).json({
      success: true,
      space: manager
    });
  } catch (error) {
    console.error('Error al obtener espacio cultural:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al obtener datos del espacio cultural',
      error: error.message
    });
  }
};

exports.getAvailability = async (req, res) => {
  try {
    const { managerId } = req.params;
    const { date } = req.query;
    
    console.log(`🔍 Obteniendo disponibilidad para manager: ${managerId}${date ? `, fecha: ${date}` : ''}`);
    
    const manager = await Manager.findOne({ where: { userId: managerId } });
    if (!manager) {
      return res.status(404).json({ success: false, message: 'Gestor cultural no encontrado' });
    }
    
    const whereCondition = { 
      managerId: manager.id
    };
    
    if (date) {
      whereCondition.date = date;
      console.log(`🔍 Buscando disponibilidad para fecha específica: ${date}`);
    } else {
      whereCondition.date = null;
      console.log('🔍 Buscando disponibilidad recurrente (sin fecha específica)');
    }
    
    const availabilityRecords = await SpaceAvailability.findAll({ 
      where: whereCondition 
    });
    
    console.log(`📊 Registros encontrados: ${availabilityRecords.length}`);

    if (availabilityRecords.length === 0) {
      const availability = {};
      for (let day = 0; day <= 6; day++) {
        const availableHours = Array.from({ length: 13 }, (_, i) => i + 8);
        availability[day] = availableHours;
        
        await SpaceAvailability.create({
          managerId: manager.id,
          dayOfWeek: day,
          hourSlots: availableHours,
          date: date ? date : null
        });
      }

      return res.status(200).json({
        success: true,
        availability,
        isSpecificDate: !!date
      });
    }

    const availability = {};
    availabilityRecords.forEach(record => {
      availability[record.dayOfWeek] = record.hourSlots;
    });

    return res.status(200).json({
      success: true,
      availability,
      isSpecificDate: !!date
    });
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al obtener configuración de disponibilidad',
      error: error.message
    });
  }
};

exports.updateAvailability = async (req, res) => {
  try {
    const { managerId } = req.params;
    const { availability, specificDate } = req.body;
    
    console.log(`🔍 Actualizando disponibilidad para manager: ${managerId}${specificDate ? `, fecha: ${specificDate}` : ', fecha: No especificada'}`);
    console.log('📅 Datos recibidos:', JSON.stringify({ 
      availability: Object.keys(availability).length + ' días', 
      specificDate 
    }));
    
    const decodedManagerId = decodeURIComponent(managerId);
    console.log(`🔍 ID decodificado: ${decodedManagerId}`);
    
    const manager = await Manager.findOne({ where: { userId: decodedManagerId } });
    if (!manager) {
      console.log(`❌ Manager no encontrado: ${decodedManagerId}`);
      return res.status(404).json({ success: false, message: 'Gestor cultural no encontrado' });
    }
    
    console.log(`✅ Manager encontrado: ${manager.id}, userId: ${manager.userId}`);

    if (specificDate) {
      try {
        console.log(`🗑️ Eliminando configuraciones anteriores para la fecha: ${specificDate}`);
        
        const deleted1 = await SpaceAvailability.destroy({
          where: {
            managerId: manager.id,
            date: specificDate
          }
        });
        
        const deleted2 = await SpaceAvailability.destroy({
          where: {
            managerId: decodedManagerId,
            date: specificDate
          }
        });
        
        console.log(`🗑️ Se eliminaron ${deleted1 + deleted2} configuraciones anteriores`);
      } catch (deleteError) {
        console.error('Error al eliminar configuraciones anteriores:', deleteError);
      }
    } else {
      try {
        console.log(`🗑️ Eliminando configuraciones generales anteriores`);
        
        const deleted1 = await SpaceAvailability.destroy({
          where: {
            managerId: manager.id,
            date: null
          }
        });
        
        const deleted2 = await SpaceAvailability.destroy({
          where: {
            managerId: decodedManagerId,
            date: null
          }
        });
        
        console.log(`🗑️ Se eliminaron ${deleted1 + deleted2} configuraciones generales anteriores`);
      } catch (deleteError) {
        console.error('Error al eliminar configuraciones generales anteriores:', deleteError);
      }
    }

    const updatedSettings = [];
    
    for (const dayKey in availability) {
      const dayOfWeek = parseInt(dayKey, 10);
      const hours = availability[dayKey];
      
      if (isNaN(dayOfWeek) || !Array.isArray(hours)) {
        console.log(`⚠️ Datos inválidos para día ${dayKey}:`, hours);
        continue;
      }
      
      if (specificDate) {
        console.log(`📝 Procesando día ${dayOfWeek}, fecha específica: ${specificDate}`);
      } else {
        console.log(`📝 Procesando día ${dayOfWeek}, fecha: No especificada`);
      }
      console.log(`📝 Horas disponibles: ${hours.join(', ')}`);
      
      try {
        const newRecord = {
          managerId: decodedManagerId,
          dayOfWeek,
          hourSlots: hours
        };
        
        if (specificDate) {
          newRecord.date = specificDate;
        } else {
          newRecord.date = null;
        }
        
        console.log('📊 Datos a guardar:', JSON.stringify(newRecord));
        
        const availabilityRecord = await SpaceAvailability.create(newRecord);
        
        console.log(`✅ Creado registro para día ${dayOfWeek}:`, availabilityRecord.id);
        console.log('📊 Datos guardados:', {
          id: availabilityRecord.id,
          managerId: availabilityRecord.managerId,
          dayOfWeek: availabilityRecord.dayOfWeek,
          date: availabilityRecord.date,
          hoursCount: hours.length
        });
        
        updatedSettings.push(availabilityRecord);
      } catch (error) {
        console.error(`❌ Error al guardar día ${dayOfWeek}:`, error);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Disponibilidad ${specificDate ? 'para fecha específica' : 'recurrente'} actualizada correctamente`,
      updatedSettings: updatedSettings.map(record => ({
        id: record.id,
        managerId: record.managerId,
        dayOfWeek: record.dayOfWeek,
        date: record.date,
        hourSlots: record.hourSlots
      }))
    });
  } catch (error) {
    console.error('Error al actualizar disponibilidad:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar configuración de disponibilidad',
      error: error.message
    });
  }
};

exports.getBlockedSlots = async (req, res) => {
  try {
    const { managerId } = req.params;
    
    const decodedManagerId = decodeURIComponent(managerId);
    
    console.log(`🔍 Buscando slots bloqueados para manager: ${decodedManagerId}`);
    
    const manager = await Manager.findOne({ where: { userId: decodedManagerId } });
    if (!manager) {
      return res.status(404).json({ success: false, message: 'Gestor cultural no encontrado' });
    }

    console.log(`✅ Manager encontrado: ${manager.id} (userId: ${manager.userId})`);

    const blockedSlotsByUserId = await BlockedSlot.findAll({ 
      where: { managerId: manager.userId },
      order: [['hour', 'ASC']]
    });
    
    console.log(`📋 Encontrados ${blockedSlotsByUserId.length} slots bloqueados por userId`);
    
    const blockedSlotsById = await BlockedSlot.findAll({ 
      where: { managerId: manager.id },
      order: [['hour', 'ASC']]
    });
    
    console.log(`📋 Encontrados ${blockedSlotsById.length} slots bloqueados por id`);
    
    const allSlots = [...blockedSlotsByUserId];
    
    for (const slot of blockedSlotsById) {
      const slotKey = slot.date 
        ? `${slot.date}-${slot.hour}` 
        : `${slot.day}-${slot.hour}`;
      
      const isDuplicate = allSlots.some(existingSlot => {
        const existingKey = existingSlot.date 
          ? `${existingSlot.date}-${existingSlot.hour}` 
          : `${existingSlot.day}-${existingSlot.hour}`;
        
        return existingKey === slotKey;
      });
      
      if (!isDuplicate) {
        allSlots.push(slot);
      }
    }
    
    console.log(`📋 Total de slots únicos: ${allSlots.length}`);
    
    allSlots.forEach((slot, index) => {
      console.log(`📌 Slot ${index + 1}:`, {
        id: slot.id,
        managerId: slot.managerId,
        hour: slot.hour,
        day: slot.day,
        dayName: slot.dayName,
        date: slot.date,
        isRecurring: slot.isRecurring
      });
    });
    
    const formattedSlots = allSlots.map(slot => {
      const hourNum = slot.hour;
      
      if (slot.date) {
        return {
          id: slot.id,
          date: slot.date,
          hour: hourNum,
          isRecurring: false,
          managerId: slot.managerId
        };
      }
      
      const today = new Date();
      const slotDay = slot.day !== undefined ? slot.day : today.getDay();
      
      return {
        id: slot.id,
        day: slotDay,
        dayName: slot.dayName,
        hour: hourNum,
        isRecurring: Boolean(slot.isRecurring),
        managerId: slot.managerId
      };
    });

    return res.status(200).json({
      success: true,
      blockedSlots: formattedSlots
    });
  } catch (error) {
    console.error('Error al obtener slots bloqueados:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al obtener slots bloqueados',
      error: error.message
    });
  }
};

exports.getBlockedSlotsDetailed = async (req, res) => {
  try {
    const { managerId } = req.params;
    
    const decodedManagerId = decodeURIComponent(managerId);
    
    console.log(`🔍 Buscando slots bloqueados detallados para manager: ${decodedManagerId}`);
    
    let allSlots = [];
    
    const slotsByUserId = await BlockedSlot.findAll({
      where: { managerId: decodedManagerId },
      order: [['hour', 'ASC']]
    });
    
    console.log(`📋 Encontrados ${slotsByUserId.length} slots por userId`);
    allSlots = [...slotsByUserId];
    
    const manager = await Manager.findOne({ where: { userId: decodedManagerId } });
    if (manager) {
      const slotsById = await BlockedSlot.findAll({
        where: { managerId: manager.id },
        order: [['hour', 'ASC']]
      });
      
      console.log(`📋 Encontrados ${slotsById.length} slots adicionales por id`);
      
      for (const slot of slotsById) {
        const isDuplicate = allSlots.some(
          existingSlot => existingSlot.hour === slot.hour
        );
        
        if (!isDuplicate) {
          allSlots.push(slot);
        }
      }
    }
    
    console.log(`📋 Total de slots únicos: ${allSlots.length}`);
    
    const slotsByDate = {};
    
    allSlots.forEach(slot => {
      const hourNum = slot.hour;
      
      const createdDate = new Date(slot.createdAt);
      const date = createdDate.toISOString().split('T')[0];
      
      console.log(`📅 Slot creado en: ${date}, hora: ${hourNum}`);
      
      if (!slotsByDate[date]) {
        slotsByDate[date] = [];
      }
      
      slotsByDate[date].push({
        id: slot.id,
        hour: hourNum,
        isRecurring: Boolean(slot.isRecurring),
        managerId: slot.managerId,
        createdAt: slot.createdAt
      });
    });
    
    const formattedResult = Object.keys(slotsByDate).map(date => {
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay();
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      
      return {
        date,
        dayOfWeek,
        dayName: dayNames[dayOfWeek],
        slots: slotsByDate[date].sort((a, b) => a.hour - b.hour)
      };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return res.status(200).json({
      success: true,
      blockedDates: formattedResult,
      totalSlots: allSlots.length
    });
  } catch (error) {
    console.error('Error al obtener slots bloqueados detallados:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al obtener slots bloqueados detallados',
      error: error.message
    });
  }
};

exports.blockSlot = async (req, res) => {
  try {
    console.log('⭐ Iniciando blockSlot con parámetros:', {
      managerId: req.params.managerId,
      body: req.body
    });
    
    const { managerId } = req.params;
    const { date, hour, day, dayName, isRecurring = false } = req.body;
    
    if (hour === undefined) {
      console.log('❌ Error: Datos incompletos para bloquear slot');
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos para bloquear slot: se requiere hora'
      });
    }
    
    console.log('📅 Datos recibidos para bloquear slot:', {
      date, hour, day, dayName, isRecurring
    });
    
    const hourNum = parseInt(hour);
    console.log('🕒 Hora validada:', hourNum);
    
    if (hourNum < 0 || hourNum > 23) {
      return res.status(400).json({
        success: false,
        message: 'La hora debe estar entre 0 y 23'
      });
    }
    
    const decodedManagerId = decodeURIComponent(managerId);
    console.log('🔍 ID decodificado:', decodedManagerId);
    
    let manager = await Manager.findOne({ where: { userId: decodedManagerId } });
    
    if (manager) {
      console.log('✅ Manager encontrado por userId:', {
        id: manager.id,
        userId: manager.userId
      });
    } else {
      manager = await Manager.findByPk(decodedManagerId);
      
      if (manager) {
        console.log('✅ Manager encontrado por ID directo:', {
          id: manager.id,
          userId: manager.userId
        });
      } else {
        console.log('⚠️ Manager no encontrado, usando ID recibido directamente');
      }
    }
    
    if (!manager) {
      console.log('🔍 Usando ID recibido directamente para bloquear slot');
      
      const slotData = {
        managerId: decodedManagerId,
        hour: hourNum,
        day: day !== undefined ? parseInt(day, 10) : undefined,
        dayName,
        date: date || null,
        dateStr: date || null,
        isRecurring: date ? false : isRecurring
      };
      
      console.log('📅 Datos del slot a crear:', slotData);
      
      console.log('🔍 Verificando si ya existe slot con datos:', slotData);
      
      const whereConditions = {
        managerId: decodedManagerId,
        hour: hourNum
      };
      
      if (date) {
        whereConditions.date = date;
        console.log('🔍 Buscando por fecha específica:', date);
      } 
      else if (day !== undefined) {
        whereConditions.day = parseInt(day, 10);
        console.log('🔍 Buscando por día recurrente:', day);
      }
      
      console.log('🔍 Condiciones de búsqueda:', whereConditions);
      
      const existingSlot = await BlockedSlot.findOne({
        where: whereConditions
      });
      
      if (existingSlot) {
        console.log('⚠️ Este horario ya está bloqueado:', existingSlot.toJSON());
        return res.status(200).json({
          success: true,
          message: 'Este horario ya está bloqueado',
          blockedSlot: existingSlot
        });
      }
      
      console.log('✅ Creando nuevo slot bloqueado con datos:', slotData);
      
      try {
        const blockedSlot = await BlockedSlot.create(slotData);
        console.log('✅ Slot bloqueado creado:', blockedSlot.toJSON());
        
        return res.status(201).json({
          success: true,
          message: 'Horario bloqueado correctamente',
          blockedSlot
        });
      } catch (createError) {
        console.error('❌ Error al crear slot bloqueado:', createError);
        return res.status(500).json({
          success: false,
          message: 'Error al crear slot bloqueado',
          error: createError.message
        });
      }
    }
    
    const slotData = {
      managerId: manager.userId,
      hour: hourNum,
      day: day !== undefined ? parseInt(day, 10) : undefined,
      dayName,
      date: date || null,
      isRecurring: date ? false : isRecurring
    };
    
    console.log('📅 Datos del slot a crear:', slotData);
    
    const whereCondition = {
      managerId: manager.userId, 
      hour: hourNum
    };
    
    if (date) {
      whereCondition.date = date;
      console.log('🔍 Buscando por fecha específica:', date);
    } 
    else if (day !== undefined) {
      whereCondition.day = parseInt(day, 10);
      console.log('🔍 Buscando por día recurrente:', day);
    }
    
    console.log('🔍 Condiciones de búsqueda:', whereCondition);
    
    const existingSlot = await BlockedSlot.findOne({
      where: whereCondition
    });
    
    if (existingSlot) {
      console.log('⚠️ Este horario ya está bloqueado:', existingSlot.toJSON());
      return res.status(200).json({
        success: true,
        message: 'Este horario ya está bloqueado',
        blockedSlot: existingSlot
      });
    }
    
    console.log('✅ Creando nuevo slot bloqueado con datos:', slotData);
    
    try {
      const blockedSlot = await BlockedSlot.create(slotData);
      console.log('✅ Slot bloqueado creado:', blockedSlot.toJSON());
      
      return res.status(201).json({
        success: true,
        message: 'Horario bloqueado correctamente',
        blockedSlot
      });
    } catch (createError) {
      console.error('❌ Error al crear slot bloqueado:', createError);
      return res.status(500).json({
        success: false,
        message: 'Error al crear slot bloqueado',
        error: createError.message
      });
    }
  } catch (error) {
    console.error('❌ Error al bloquear slot:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al bloquear slot',
      error: error.message
    });
  }
};


exports.unblockSlot = async (req, res) => {
  try {
    console.log('⭐ Iniciando unblockSlot con parámetros:', {
      managerId: req.params.managerId,
      body: req.body
    });
    
    const { managerId } = req.params;
    const { date, hour } = req.body;
    
    if (hour === undefined) {
      console.log('❌ Error: Datos incompletos para desbloquear slot');
      return res.status(400).json({
        success: false,
        message: 'Se requiere la hora para desbloquear slot'
      });
    }
    
    const hourNum = parseInt(hour);
    if (isNaN(hourNum) || hourNum < 0 || hourNum > 23) {
      return res.status(400).json({
        success: false,
        message: 'La hora debe ser un número entre 0 y 23'
      });
    }
    
    const decodedManagerId = decodeURIComponent(managerId);
    console.log('🔍 ID decodificado:', decodedManagerId);
    
    let manager = await Manager.findOne({ where: { userId: decodedManagerId } });
    
    if (manager) {
      console.log('✅ Manager encontrado por userId:', {
        id: manager.id,
        userId: manager.userId
      });
    } else {
      manager = await Manager.findByPk(decodedManagerId);
      
      if (manager) {
        console.log('✅ Manager encontrado por ID directo:', {
          id: manager.id,
          userId: manager.userId
        });
      } else {
        console.log('⚠️ Manager no encontrado, buscando directamente en BlockedSlots');
      }
    }
    
    if (!manager) {
      console.log('🔍 Buscando directamente en BlockedSlots con managerId:', decodedManagerId);
      
      const whereCondition = {
        hour: hourNum,
        managerId: decodedManagerId
      };
      
      if (date) {
        whereCondition.date = date;
        console.log('🔍 Buscando por fecha específica:', date);
      }
      
      console.log('🔍 Buscando slot bloqueado con condiciones:', whereCondition);
      
      const existingSlot = await BlockedSlot.findOne({
        where: whereCondition
      });
      
      if (existingSlot) {
        console.log('✅ Slot bloqueado encontrado:', existingSlot.toJSON());
      } else {
        console.log('❌ No se encontró ningún slot bloqueado con estas condiciones');
      }
      
      const deleteResult = await BlockedSlot.destroy({
        where: whereCondition
      });
      
      if (deleteResult > 0) {
        console.log(`✅ Se eliminaron ${deleteResult} slots bloqueados`);
        return res.status(200).json({
          success: true,
          message: `Se desbloquearon ${deleteResult} horarios`
        });
      } else {
        console.log('❌ No se eliminó ningún slot bloqueado');
        return res.status(404).json({
          success: false,
          message: 'No se encontró el horario bloqueado'
        });
      }
    }
    
    const whereCondition = {
      hour: hourNum,
      managerId: manager.userId
    };
    
    if (date) {
      whereCondition.date = date;
      console.log('🔍 Buscando por fecha específica:', date);
    }
    
    console.log('🔍 Buscando slot bloqueado con condiciones (manager encontrado):', whereCondition);
    
    const existingSlot = await BlockedSlot.findOne({
      where: whereCondition
    });
    
    if (existingSlot) {
      console.log('✅ Slot bloqueado encontrado:', existingSlot.toJSON());
    } else {
      console.log('❌ No se encontró ningún slot bloqueado con estas condiciones');
      
      const alternativeCondition = {
        hour: hourNum,
        managerId: manager.id
      };
      
      if (date) {
        alternativeCondition.date = date;
      }
      
      console.log('🔍 Buscando con condiciones alternativas:', alternativeCondition);
      
      const alternativeSlot = await BlockedSlot.findOne({
        where: alternativeCondition
      });
      
      if (alternativeSlot) {
        console.log('✅ Slot bloqueado encontrado con ID alternativo:', alternativeSlot.toJSON());
      } else {
        console.log('❌ No se encontró ningún slot bloqueado con condiciones alternativas');
      }
    }
    
    const deleteResult = await BlockedSlot.destroy({
      where: whereCondition
    });
    
    if (deleteResult > 0) {
      console.log(`✅ Se eliminaron ${deleteResult} slots bloqueados`);
      return res.status(200).json({
        success: true,
        message: `Se desbloquearon ${deleteResult} horarios`
      });
    } else {
      const alternativeCondition = {
        hour: hourNum,
        managerId: manager.id
      };
      
      if (date) {
        alternativeCondition.date = date;
      }
      
      const alternativeDeleteResult = await BlockedSlot.destroy({
        where: alternativeCondition
      });
      
      if (alternativeDeleteResult > 0) {
        console.log(`✅ Se eliminaron ${alternativeDeleteResult} slots bloqueados (usando ID alternativo)`);
        return res.status(200).json({
          success: true,
          message: `Se desbloquearon ${alternativeDeleteResult} horarios`
        });
      } else {
        console.log('❌ No se eliminó ningún slot bloqueado');
        return res.status(404).json({
          success: false,
          message: 'No se encontró el horario bloqueado'
        });
      }
    }
  } catch (error) {
    console.error('❌ Error al desbloquear slot:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al desbloquear slot',
      error: error.message
    });
  }
};

exports.unblockSlotById = async (req, res) => {
  try {
    const { slotId } = req.params;
    
    console.log(`⭐ Intentando desbloquear slot por ID: ${slotId}`);
    
    const slot = await BlockedSlot.findByPk(slotId);
    
    if (!slot) {
      console.log(`❌ No se encontró el slot con ID: ${slotId}`);
      return res.status(404).json({
        success: false,
        message: 'No se encontró el slot con el ID especificado'
      });
    }
    
    console.log(`✅ Slot encontrado:`, {
      id: slot.id,
      managerId: slot.managerId,
      date: slot.dateStr || slot.date,
      hour: slot.hour
    });
    
    await slot.destroy();
    
    console.log(`🗑️ Slot eliminado correctamente`);
    
    return res.status(200).json({
      success: true,
      message: 'Horario desbloqueado correctamente',
      slotInfo: {
        id: slot.id,
        date: slot.dateStr || slot.date,
        hour: slot.hour
      }
    });
  } catch (error) {
    console.error('❌ Error al desbloquear slot por ID:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al desbloquear horario',
      error: error.message
    });
  }
};

exports.getEvents = async (req, res) => {
  try {
    const { managerId } = req.params;
    
    const manager = await Manager.findOne({ where: { userId: managerId } });
    if (!manager) {
      return res.status(404).json({ success: false, message: 'Gestor cultural no encontrado' });
    }
    const events = await Event.findAll({
      where: { spaceId: manager.id },
      order: [['fecha', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Error al obtener eventos:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al obtener eventos del espacio cultural',
      error: error.message
    });
  }
};

exports.resetBlockedSlots = async (req, res) => {
  try {
    const { managerId } = req.params;
    
    const decodedManagerId = decodeURIComponent(managerId);
    
    console.log(`🔄 Restaurando configuración para manager: ${decodedManagerId}`);
    
    const manager = await Manager.findOne({ where: { userId: decodedManagerId } });
    if (!manager) {
      return res.status(404).json({ success: false, message: 'Gestor cultural no encontrado' });
    }

    console.log(`✅ Manager encontrado: ${manager.id} (userId: ${manager.userId})`);

    const deletedByUserId = await BlockedSlot.destroy({ 
      where: { managerId: manager.userId }
    });
    
    console.log(`🗑️ Eliminados ${deletedByUserId} slots bloqueados por userId`);
    
    const deletedById = await BlockedSlot.destroy({ 
      where: { managerId: manager.id }
    });
    
    console.log(`🗑️ Eliminados ${deletedById} slots bloqueados por id`);
    
    await SpaceAvailability.destroy({
      where: { managerId: manager.id }
    });
    
    const availability = {};
    for (let day = 0; day <= 6; day++) {
      const availableHours = Array.from({ length: 13 }, (_, i) => i + 8);
      availability[day] = availableHours;
      
      await SpaceAvailability.create({
        managerId: manager.id,
        dayOfWeek: day,
        availableHours
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Configuración restaurada correctamente',
      deletedSlots: deletedByUserId + deletedById,
      availability
    });
  } catch (error) {
    console.error('Error al restaurar configuración:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al restaurar configuración',
      error: error.message
    });
  }
};
