const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Asegurarnos de que el directorio de uploads exista
const uploadDir = path.join(__dirname, '../uploads');
const profilePicsDir = path.join(uploadDir, 'profile-pics');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(profilePicsDir)) {
    fs.mkdirSync(profilePicsDir, { recursive: true });
}

// Configurar almacenamiento para multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, profilePicsDir);
    },
    filename: function (req, file, cb) {
        // Crear un nombre único para el archivo
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'profile-' + uniqueSuffix + ext);
    }
});

// Filtro para validar que sean archivos de imagen
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos de imagen'), false);
    }
};

// Configuración de multer
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB máximo
    }
});

module.exports = { upload };
