// scripts/test-email.js
const emailService = require('../services/emailService');
const dotenv = require('dotenv');
dotenv.config();

async function testEmail() {
    console.log('\n📧 Probando envío de correo...\n');
    
    try {
        const result = await emailService.sendRecoveryEmail(
            'test@example.com',
            'Usuario Test',
            '123456',
            'test-token-123'
        );
        
        if (result.success) {
            console.log('✅ Correo enviado exitosamente!');
            if (result.previewUrl) {
                console.log('📝 Ver correo en:', result.previewUrl);
            }
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testEmail();