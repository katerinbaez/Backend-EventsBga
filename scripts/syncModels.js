const { ArtistProfile } = require('../models/ArtistProfile');

async function syncModels() {
  try {
    // Sincronizar el modelo ArtistProfile
    await ArtistProfile.sync({ alter: true });
    console.log('Modelo ArtistProfile sincronizado exitosamente');
  } catch (error) {
    console.error('Error al sincronizar modelos:', error);
  }
  process.exit();
}

syncModels();
