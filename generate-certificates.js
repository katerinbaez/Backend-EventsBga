// Script para generar certificados SSL autofirmados
// Crea certificados para desarrollo local con validez de 1 año

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const selfsigned = require('selfsigned');

const certDir = path.join(__dirname, 'certificates');
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
}

console.log('Generando certificados SSL autofirmados...');

const attrs = [
  { name: 'commonName', value: 'localhost' },
  { name: 'countryName', value: 'CO' },
  { name: 'organizationName', value: 'EventsBGA Development' }
];

const options = {
  days: 365,
  keySize: 2048,
  extensions: [
    { name: 'subjectAltName', altNames: [
      { type: 2, value: 'localhost' },
      { type: 2, value: '192.168.1.7' },
      { type: 7, ip: '127.0.0.1' },
      { type: 7, ip: '192.168.1.7' }
    ]}
  ]
};

try {
  const pems = selfsigned.generate(attrs, options);
  
  fs.writeFileSync(path.join(certDir, 'key.pem'), pems.private);
  console.log('✅ Clave privada guardada en certificates/key.pem');
  
  fs.writeFileSync(path.join(certDir, 'cert.pem'), pems.cert);
  console.log('✅ Certificado guardado en certificates/cert.pem');
  
  console.log('\n🔒 Certificados SSL generados correctamente');
  console.log('\nNOTA IMPORTANTE:');
  console.log('Estos certificados son autofirmados y no serán reconocidos como confiables por los navegadores o aplicaciones.');
  console.log('Para desarrollo y pruebas, deberás configurar tu aplicación Android para aceptar estos certificados.');
  console.log('Para producción, deberías obtener certificados de una autoridad certificadora reconocida.');
} catch (error) {
  console.error('❌ Error al generar certificados:', error);
}
