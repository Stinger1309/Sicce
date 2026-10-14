// scripts/setup-ethereal.js
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function setupEthereal() {
    console.log('\n📧 Configuración de Ethereal para desarrollo');
    console.log('============================================\n');
    
    try {
        // Crear cuenta Ethereal
        console.log('🔄 Creando cuenta Ethereal...');
        const testAccount = await nodemailer.createTestAccount();
        
        console.log('\n✅ Cuenta creada exitosamente!');
        console.log('📧 Usuario:', testAccount.user);
        console.log('🔑 Contraseña:', testAccount.pass);
        console.log('📝 Webmail: https://ethereal.email/login\n');
        
        // Leer archivo .env
        const envPath = path.join(process.cwd(), '.env');
        let envContent = '';
        
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
        }
        
        // Actualizar o agregar variables de Ethereal
        const envLines = envContent.split('\n');
        let hasSMTPHost = false;
        let hasSMTPUser = false;
        let hasSMTPPass = false;
        
        const updatedLines = envLines.map(line => {
            if (line.startsWith('SMTP_HOST=')) {
                hasSMTPHost = true;
                return `SMTP_HOST=smtp.ethereal.email`;
            }
            if (line.startsWith('SMTP_USER=')) {
                hasSMTPUser = true;
                return `SMTP_USER=${testAccount.user}`;
            }
            if (line.startsWith('SMTP_PASS=')) {
                hasSMTPPass = true;
                return `SMTP_PASS=${testAccount.pass}`;
            }
            return line;
        });
        
        // Agregar si no existen
        if (!hasSMTPHost) updatedLines.push('SMTP_HOST=smtp.ethereal.email');
        if (!hasSMTPUser) updatedLines.push(`SMTP_USER=${testAccount.user}`);
        if (!hasSMTPPass) updatedLines.push(`SMTP_PASS=${testAccount.pass}`);
        if (!updatedLines.some(l => l.startsWith('SMTP_SECURE='))) {
            updatedLines.push('SMTP_SECURE=false');
        }
        if (!updatedLines.some(l => l.startsWith('NODE_ENV='))) {
            updatedLines.push('NODE_ENV=development');
        }
        
        // Guardar archivo .env
        fs.writeFileSync(envPath, updatedLines.join('\n'));
        console.log('✅ Archivo .env actualizado con las credenciales de Ethereal');
        
        console.log('\n🎯 Configuración completada!');
        console.log('📌 Para ver los correos enviados:');
        console.log(`   1. Ve a https://ethereal.email/login`);
        console.log(`   2. Usa el usuario y contraseña mostrados arriba`);
        console.log(`   3. Los correos aparecerán en la bandeja de entrada\n`);
        
        rl.close();
    } catch (error) {
        console.error('❌ Error:', error.message);
        rl.close();
        process.exit(1);
    }
}

// Ejecutar setup
setupEthereal();