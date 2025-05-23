const { Manager } = require('../models/Manager');
const { Event } = require('../models/Event');

// Importar los modelos para disponibilidad y horarios bloqueados
const SpaceAvailability = require('../models/SpaceAvailability');
const BlockedSlot = require('../models/BlockedSlot');

// Obtener datos del espacio cultural por ID de manager
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

// Obtener configuración de disponibilidad
exports.getAvailability = async (req, res) => {
  try {
    const { managerId } = req.params;
    const { date } = req.query;
    
    console.log(`🔍 Obteniendo disponibilidad para manager: ${managerId}${date ? `, fecha: ${date}` : ''}`);
    
    // Verificar si el manager existe
    const manager = await Manager.findOne({ where: { userId: managerId } });
    if (!manager) {
      return res.status(404).json({ success: false, message: 'Gestor cultural no encontrado' });
    }
    
    // Construir condición de búsqueda
    const whereCondition = { 
      managerId: manager.id
    };
    
    // Si hay fecha específica, buscar por esa fecha
    if (date) {
      whereCondition.date = date;
      console.log(`🔍 Buscando disponibilidad para fecha específica: ${date}`);
    } else {
      whereCondition.date = null;
      console.log('🔍 Buscando disponibilidad recurrente (sin fecha específica)');
    }
    
    // Buscar registros de disponibilidad
    const availabilityRecords = await SpaceAvailability.findAll({ 
      where: whereCondition 
    });
    
    console.log(`📊 Registros encontrados: ${availabilityRecords.length}`);

    // Si no hay registros, crear disponibilidad por defecto
    if (availabilityRecords.length === 0) {
      // Crear disponibilidad por defecto (todos los días, horario comercial)
      const availability = {};
      for (let day = 0; day <= 6; day++) {
        // Horario de 8am a 8pm por defecto
        const availableHours = Array.from({ length: 13 }, (_, i) => i + 8);
        availability[day] = availableHours;
        
        // Guardar en la base de datos
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

    // Formatear resultado
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

// Actualizar configuración de disponibilidad
exports.updateAvailability = async (req, res) => {
  try {
    const { managerId } = req.params;
    const { availability, specificDate } = req.body;
    
    console.log(`🔍 Actualizando disponibilidad para manager: ${managerId}${specificDate ? `, fecha: ${specificDate}` : ', fecha: No especificada'}`);
    console.log('📅 Datos recibidos:', JSON.stringify({ 
      availability: Object.keys(availability).length + ' días', 
      specificDate 
    }));
    
    // Decodificar el ID si viene codificado en la URL
    const decodedManagerId = decodeURIComponent(managerId);
    console.log(`🔍 ID decodificado: ${decodedManagerId}`);
    
    // Verificar si el manager existe
    const manager = await Manager.findOne({ where: { userId: decodedManagerId } });
    if (!manager) {
      console.log(`❌ Manager no encontrado: ${decodedManagerId}`);
      return res.status(404).json({ success: false, message: 'Gestor cultural no encontrado' });
    }
    
    console.log(`✅ Manager encontrado: ${manager.id}, userId: ${manager.userId}`);

    // Si hay fecha específica, eliminar configuraciones anteriores para esa fecha
    if (specificDate) {
      try {
        console.log(`🗑️ Eliminando configuraciones anteriores para la fecha: ${specificDate}`);
        
        // Eliminar usando tanto el ID como el userId para asegurar que se eliminen todos los registros
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
      // Si es configuración general, eliminar configuraciones generales anteriores
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

    // Procesar cada día en la configuración recibida
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
        // Crear nuevo registro directamente
        const newRecord = {
          // IMPORTANTE: Usar el ID decodificado (userId) en lugar del ID del manager
          managerId: decodedManagerId,
          dayOfWeek,
          hourSlots: hours
        };
        
        // Si hay fecha específica, incluirla en date
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

// Obtener slots bloqueados
exports.getBlockedSlots = async (req, res) => {
  try {
    const { managerId } = req.params;
    
    // Decodificar el ID si viene codificado en la URL
    const decodedManagerId = decodeURIComponent(managerId);
    
    console.log(`🔍 Buscando slots bloqueados para manager: ${decodedManagerId}`);
    
    // Verificar si el manager existe
    const manager = await Manager.findOne({ where: { userId: decodedManagerId } });
    if (!manager) {
      return res.status(404).json({ success: false, message: 'Gestor cultural no encontrado' });
    }

    console.log(`✅ Manager encontrado: ${manager.id} (userId: ${manager.userId})`);

    // Buscar slots bloqueados por userId (formato OAuth)
    const blockedSlotsByUserId = await BlockedSlot.findAll({ 
      where: { managerId: manager.userId },
      order: [['hour', 'ASC']]
    });
    
    console.log(`📋 Encontrados ${blockedSlotsByUserId.length} slots bloqueados por userId`);
    
    // Buscar slots bloqueados por id (formato UUID)
    const blockedSlotsById = await BlockedSlot.findAll({ 
      where: { managerId: manager.id },
      order: [['hour', 'ASC']]
    });
    
    console.log(`📋 Encontrados ${blockedSlotsById.length} slots bloqueados por id`);
    
    // Combinar resultados (eliminando duplicados)
    const allSlots = [...blockedSlotsByUserId];
    
    // Agregar slots por id solo si no están ya incluidos
    for (const slot of blockedSlotsById) {
      // Crear una clave única que incluya fecha o día + hora
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
    
    // Mostrar detalles de cada slot para diagnóstico
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
    
    // Formatear los resultados para el frontend
    const formattedSlots = allSlots.map(slot => {
      // Usar la hora tal como viene
      const hourNum = slot.hour;
      
      // Si el slot tiene fecha específica, usarla
      if (slot.date) {
        return {
          id: slot.id,
          date: slot.date,
          hour: hourNum,
          isRecurring: false, // Slots con fecha específica nunca son recurrentes
          managerId: slot.managerId // Agregar managerId para diagnóstico
        };
      }
      
      // Para slots recurrentes (por día de la semana)
      // CORRECCIÓN: Usar el día guardado en la base de datos en lugar del día actual
      // Si el slot no tiene día definido, usar el día actual como fallback
      const today = new Date();
      const slotDay = slot.day !== undefined ? slot.day : today.getDay();
      
      return {
        id: slot.id,
        day: slotDay,
        dayName: slot.dayName, // Incluir el nombre del día si está disponible
        hour: hourNum,
        isRecurring: Boolean(slot.isRecurring),
        managerId: slot.managerId // Agregar managerId para diagnóstico
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

// Obtener slots bloqueados con formato detallado
exports.getBlockedSlotsDetailed = async (req, res) => {
  try {
    const { managerId } = req.params;
    
    // Decodificar el ID si viene codificado en la URL
    const decodedManagerId = decodeURIComponent(managerId);
    
    console.log(`🔍 Buscando slots bloqueados detallados para manager: ${decodedManagerId}`);
    
    // Buscar todos los slots bloqueados
    let allSlots = [];
    
    // Buscar por userId (formato OAuth)
    const slotsByUserId = await BlockedSlot.findAll({
      where: { managerId: decodedManagerId },
      order: [['hour', 'ASC']]
    });
    
    console.log(`📋 Encontrados ${slotsByUserId.length} slots por userId`);
    allSlots = [...slotsByUserId];
    
    // Buscar también por el manager.id (formato UUID) si existe
    const manager = await Manager.findOne({ where: { userId: decodedManagerId } });
    if (manager) {
      const slotsById = await BlockedSlot.findAll({
        where: { managerId: manager.id },
        order: [['hour', 'ASC']]
      });
      
      console.log(`📋 Encontrados ${slotsById.length} slots adicionales por id`);
      
      // Agregar slots que no estén duplicados
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
    
    // Agrupar por fecha usando createdAt
    const slotsByDate = {};
    
    allSlots.forEach(slot => {
      // Usar la hora tal como viene
      const hourNum = slot.hour;
      
      // Usar createdAt para obtener la fecha correcta
      const createdDate = new Date(slot.createdAt);
      const date = createdDate.toISOString().split('T')[0];
      
      console.log(`📅 Slot creado en: ${date}, hora: ${hourNum}`);
      
      // Inicializar array para esta fecha si no existe
      if (!slotsByDate[date]) {
        slotsByDate[date] = [];
      }
      
      // Agregar slot a la fecha correspondiente
      slotsByDate[date].push({
        id: slot.id,
        hour: hourNum,
        isRecurring: Boolean(slot.isRecurring),
        managerId: slot.managerId,
        createdAt: slot.createdAt
      });
    });
    
    // Convertir a formato más amigable para el frontend
    const formattedResult = Object.keys(slotsByDate).map(date => {
      // Crear objeto Date para obtener el día de la semana
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay(); // 0: domingo, 1: lunes, etc.
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      
      return {
        date,
        dayOfWeek,
        dayName: dayNames[dayOfWeek],
        slots: slotsByDate[date].sort((a, b) => a.hour - b.hour) // Ordenar por hora
      };
    }).sort((a, b) => new Date(a.date) - new Date(b.date)); // Ordenar por fecha
    
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

// Bloquear slot
exports.blockSlot = async (req, res) => {
  try {
    console.log('⭐ Iniciando blockSlot con parámetros:', {
      managerId: req.params.managerId,
      body: req.body
    });
    
    const { managerId } = req.params;
    const { date, hour, day, dayName, isRecurring = false } = req.body;
    
    // Verificar datos recibidos
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
    
    // Convertir hora a entero
    const hourNum = parseInt(hour);
    console.log('🕒 Hora validada:', hourNum);
    
    // Validar que la hora esté dentro del rango válido (0-23)
    if (hourNum < 0 || hourNum > 23) {
      return res.status(400).json({
        success: false,
        message: 'La hora debe estar entre 0 y 23'
      });
    }
    
    // Decodificar el ID si viene codificado en la URL
    const decodedManagerId = decodeURIComponent(managerId);
    console.log('🔍 ID decodificado:', decodedManagerId);
    
    // Buscar el manager por userId (para IDs de OAuth)
    let manager = await Manager.findOne({ where: { userId: decodedManagerId } });
    
    if (manager) {
      console.log('✅ Manager encontrado por userId:', {
        id: manager.id,
        userId: manager.userId
      });
    } else {
      // Si no se encuentra, intentar buscar directamente por ID (para UUIDs)
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
    
    // Si aún no se encuentra, crear un slot bloqueado usando directamente el ID recibido
    if (!manager) {
      console.log('🔍 Usando ID recibido directamente para bloquear slot');
      
      // Preparar datos para la creación del slot
      const slotData = {
        managerId: decodedManagerId, // Usar el ID recibido directamente
        hour: hourNum,
        day: day !== undefined ? parseInt(day, 10) : undefined,
        dayName,
        date: date || null, // Añadir fecha específica si existe
        dateStr: date || null, // Guardar también como string para compatibilidad
        isRecurring: date ? false : isRecurring // Si hay fecha específica, no es recurrente
      };
      
      console.log('📅 Datos del slot a crear:', slotData);
      
      console.log('🔍 Verificando si ya existe slot con datos:', slotData);
      
      // Verificar si ya existe un slot bloqueado
      const whereConditions = {
        managerId: decodedManagerId,
        hour: hourNum
      };
      
      // Si se especificó una fecha específica, buscar por fecha
      if (date) {
        whereConditions.date = date;
        console.log('🔍 Buscando por fecha específica:', date);
      } 
      // Si no hay fecha pero hay día, buscar por día
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
        // Crear el slot bloqueado
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
    
    // Preparar datos para la creación del slot
    const slotData = {
      managerId: manager.userId, // Usar userId en lugar de id para mantener el formato OAuth
      hour: hourNum,
      day: day !== undefined ? parseInt(day, 10) : undefined,
      dayName,
      date: date || null, // Añadir fecha específica si existe
      isRecurring: date ? false : isRecurring // Si hay fecha específica, no es recurrente
    };
    
    console.log('📅 Datos del slot a crear:', slotData);
    
    // Preparar condiciones de búsqueda para verificar si ya existe
    const whereCondition = {
      managerId: manager.userId, // Usar userId en lugar de id para mantener el formato OAuth
      hour: hourNum
    };
    
    // Si se especificó una fecha específica, incluirla en la condición
    if (date) {
      whereCondition.date = date;
      console.log('🔍 Buscando por fecha específica:', date);
    } 
    // Si no hay fecha pero hay día, buscar por día
    else if (day !== undefined) {
      whereCondition.day = parseInt(day, 10);
      console.log('🔍 Buscando por día recurrente:', day);
    }
    
    console.log('🔍 Condiciones de búsqueda:', whereCondition);
    
    // Verificar si el slot ya está bloqueado
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
      // Crear el slot bloqueado
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

// Desbloquear slot
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
    
    // Validar hora (0-23)
    const hourNum = parseInt(hour);
    if (isNaN(hourNum) || hourNum < 0 || hourNum > 23) {
      return res.status(400).json({
        success: false,
        message: 'La hora debe ser un número entre 0 y 23'
      });
    }
    
    // Decodificar el ID si viene codificado en la URL
    const decodedManagerId = decodeURIComponent(managerId);
    console.log('🔍 ID decodificado:', decodedManagerId);
    
    // Buscar el manager por userId (para IDs de OAuth)
    let manager = await Manager.findOne({ where: { userId: decodedManagerId } });
    
    if (manager) {
      console.log('✅ Manager encontrado por userId:', {
        id: manager.id,
        userId: manager.userId
      });
    } else {
      // Si no se encuentra, intentar buscar directamente por ID (para UUIDs)
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
    
    // Si aún no se encuentra, intentar buscar en la tabla BlockedSlots directamente
    if (!manager) {
      console.log('🔍 Buscando directamente en BlockedSlots con managerId:', decodedManagerId);
      
      // Preparar condiciones de búsqueda para BlockedSlot
      const whereCondition = {
        hour: hourNum,
        managerId: decodedManagerId
      };
      
      // Si se especificó una fecha específica, incluirla en la condición
      if (date) {
        whereCondition.date = date;
        console.log('🔍 Buscando por fecha específica:', date);
      }
      
      console.log('🔍 Buscando slot bloqueado con condiciones:', whereCondition);
      
      // Primero verificar si existe el slot
      const existingSlot = await BlockedSlot.findOne({
        where: whereCondition
      });
      
      if (existingSlot) {
        console.log('✅ Slot bloqueado encontrado:', existingSlot.toJSON());
      } else {
        console.log('❌ No se encontró ningún slot bloqueado con estas condiciones');
      }
      
      // Intentar eliminar el slot
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
    
    // Si encontramos el manager, usar su userId (formato OAuth) para buscar el slot bloqueado
    // Preparar condiciones de búsqueda
    const whereCondition = {
      hour: hourNum,
      managerId: manager.userId // Usar userId en lugar de id para mantener el formato OAuth
    };
    
    // Si se especificó una fecha específica, incluirla en la condición
    if (date) {
      whereCondition.date = date;
      console.log('🔍 Buscando por fecha específica:', date);
    }
    
    console.log('🔍 Buscando slot bloqueado con condiciones (manager encontrado):', whereCondition);
    
    // Verificar si existe el slot
    const existingSlot = await BlockedSlot.findOne({
      where: whereCondition
    });
    
    if (existingSlot) {
      console.log('✅ Slot bloqueado encontrado:', existingSlot.toJSON());
    } else {
      console.log('❌ No se encontró ningún slot bloqueado con estas condiciones');
      
      // Intentar buscar con el ID del manager en lugar del userId
      const alternativeCondition = {
        hour: hourNum,
        managerId: manager.id
      };
      
      // Si se especificó una fecha específica, incluirla en la condición alternativa
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
    
    // Intentar eliminar el slot
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
      // Si no se eliminó ningún slot, intentar con el ID del manager
      const alternativeCondition = {
        hour: hourNum,
        managerId: manager.id
      };
      
      // Si se especificó una fecha específica, incluirla en la condición alternativa
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

// Desbloquear slot por ID específico
exports.unblockSlotById = async (req, res) => {
  try {
    const { slotId } = req.params;
    
    console.log(`⭐ Intentando desbloquear slot por ID: ${slotId}`);
    
    // Buscar el slot por ID
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
    
    // Eliminar el slot
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

// Obtener eventos del espacio cultural
exports.getEvents = async (req, res) => {
  try {
    const { managerId } = req.params;
    
    // Verificar si el manager existe
    const manager = await Manager.findOne({ where: { userId: managerId } });
    if (!manager) {
      return res.status(404).json({ success: false, message: 'Gestor cultural no encontrado' });
    }

    // Buscar eventos del espacio cultural
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

// Restaurar configuración (eliminar todos los slots bloqueados)
exports.resetBlockedSlots = async (req, res) => {
  try {
    const { managerId } = req.params;
    
    // Decodificar el ID si viene codificado en la URL
    const decodedManagerId = decodeURIComponent(managerId);
    
    console.log(`🔄 Restaurando configuración para manager: ${decodedManagerId}`);
    
    // Verificar si el manager existe
    const manager = await Manager.findOne({ where: { userId: decodedManagerId } });
    if (!manager) {
      return res.status(404).json({ success: false, message: 'Gestor cultural no encontrado' });
    }

    console.log(`✅ Manager encontrado: ${manager.id} (userId: ${manager.userId})`);

    // Eliminar slots bloqueados por userId (formato OAuth)
    const deletedByUserId = await BlockedSlot.destroy({ 
      where: { managerId: manager.userId }
    });
    
    console.log(`🗑️ Eliminados ${deletedByUserId} slots bloqueados por userId`);
    
    // Eliminar slots bloqueados por id (formato UUID)
    const deletedById = await BlockedSlot.destroy({ 
      where: { managerId: manager.id }
    });
    
    console.log(`🗑️ Eliminados ${deletedById} slots bloqueados por id`);
    
    // Restaurar disponibilidad por defecto
    // Primero eliminar configuración existente
    await SpaceAvailability.destroy({
      where: { managerId: manager.id }
    });
    
    // Crear disponibilidad por defecto (todos los días, horario comercial)
    const availability = {};
    for (let day = 0; day <= 6; day++) {
      // Horario de 8am a 8pm por defecto
      const availableHours = Array.from({ length: 13 }, (_, i) => i + 8);
      availability[day] = availableHours;
      
      // Guardar en la base de datos
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
