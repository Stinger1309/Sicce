// services/emailService.js
const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    async initializeTransporter() {
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;

        console.log('🔍 Configuración SMTP:');
        console.log(`   Usuario: ${user || 'NO CONFIGURADO'}`);
        console.log(`   Contraseña: ${pass ? '******** (configurada)' : 'NO CONFIGURADA'}`);

        if (!user || !pass) {
            console.error('❌ SMTP_USER o SMTP_PASS no configurados en .env');
            this.createDummyTransporter();
            return;
        }

        const config = {
            service: 'gmail',
            auth: {
                user: user,
                pass: String(pass).replace(/\s/g, '')
            }
        };

        try {
            this.transporter = nodemailer.createTransport(config);
            await this.transporter.verify();
            console.log('✅ Conexión SMTP exitosa');
            console.log(`📧 Correo: ${user}`);
        } catch (error) {
            console.error('\n❌ Error de autenticación Gmail:', error.message);
            console.log('\n🔍 Posibles soluciones:');
            console.log('   1. Usa una contraseña de aplicación (16 caracteres)');
            console.log('   2. No uses tu contraseña normal de Gmail');
            console.log('   3. Verifica que no haya espacios en la contraseña');
            console.log('   4. Asegúrate de tener activa la verificación en 2 pasos');
            console.log('   5. Si usas cuenta corporativa (Google Workspace), contacta a tu admin\n');
            this.createDummyTransporter();
        }
    }

    createDummyTransporter() {
        this.transporter = {
            sendMail: async (mailOptions) => {
                console.log('\n📧 ========================================');
                console.log('📧 CORREO (MODO PRUEBA)');
                console.log('📧 ========================================');
                console.log(`📧 Para: ${mailOptions.to}`);
                console.log(`📧 Asunto: ${mailOptions.subject}`);
                if (mailOptions.html) {
                    const codeMatch = mailOptions.html.match(/class="code">(\d+)<\/div>/);
                    if (codeMatch) {
                        console.log(`📧 CÓDIGO: ${codeMatch[1]}`);
                        console.log('📧 ⚠️ USA ESTE CÓDIGO PARA PROBAR');
                    }
                }
                console.log('📧 ========================================\n');
                return {
                    messageId: 'test-' + Date.now(),
                    response: 'Test email'
                };
            }
        };
    }

    async sendRecoveryEmail(email, nombre, codigo, token) {
        try {
            if (!this.transporter) {
                await this.initializeTransporter();
            }

            const mailOptions = {
                from: `"IADEY" <${process.env.SMTP_USER}>`,
                to: email,
                subject: '🔐 Código de Recuperación - IADEY',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: #264653; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                            <h1 style="margin: 0;">🔐 Recuperación de Contraseña</h1>
                        </div>
                        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
                            <h2>Hola ${nombre},</h2>
                            <p>Has solicitado restablecer tu contraseña.</p>
                            
                            <div style="background: #ffeaa7; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
                                <p style="margin: 0; color: #d63031; font-weight: bold;">⏱️ Este código expira en 1 minuto</p>
                            </div>
                            
                            <div style="background: #f8f9fa; border: 2px dashed #264653; border-radius: 10px; padding: 30px; text-align: center; margin: 20px 0;">
                                <p style="color: #666;">Tu código de verificación es:</p>
                                <div style="font-size: 48px; font-weight: bold; color: #264653; letter-spacing: 10px; font-family: monospace;">${codigo}</div>
                            </div>
                            
                            <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                <p style="margin: 0; color: #856404;"><strong>⚠️ No compartas este código con nadie</strong></p>
                            </div>
                        </div>
                    </div>
                `
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Correo enviado exitosamente');
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Error enviando correo:', error.message);
            throw error;
        }
    }

    async sendPasswordChangedEmail(email, nombre) {
        try {
            if (!this.transporter) {
                await this.initializeTransporter();
            }

            const mailOptions = {
                from: `"IADEY" <${process.env.SMTP_USER}>`,
                to: email,
                subject: '✅ Contraseña Actualizada - IADEY',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: #28a745; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                            <h1 style="margin: 0;">✅ Contraseña Actualizada</h1>
                        </div>
                        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
                            <h2>Hola ${nombre},</h2>
                            <p>Tu contraseña ha sido actualizada exitosamente.</p>
                        </div>
                    </div>
                `
            };

            const info = await this.transporter.sendMail(mailOptions);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Error enviando correo:', error.message);
            throw error;
        }
    }

    /**
     * Notifica aprobación de crédito e incluye requisitos a presentar
     */
    async sendAprobacionCreditoEmail({
      email,
      nombre,
      codigoExpediente,
      monto,
      requisitos = [],
      cita = null
    }) {
      if (!this.transporter) await this.initializeTransporter();

      const listaReq = (requisitos || [])
        .map((r, i) => `<li style="margin:6px 0;">${i + 1}. ${r.nombre || r.nombre_requisito || r}</li>`)
        .join('');

      const bloqueCita = cita
        ? `<div style="background:#e8f5f3;padding:14px;border-radius:8px;margin:16px 0;">
             <p style="margin:0;font-weight:bold;color:#264653;">📅 Cita de atención</p>
             <p style="margin:8px 0 0;">Fecha: <strong>${cita.fecha}</strong> — Hora: <strong>${cita.hora}</strong></p>
             ${cita.inspector ? `<p style="margin:4px 0 0;">Inspector: ${cita.inspector}</p>` : ''}
           </div>`
        : '';

      const mailOptions = {
        from: `"IADEY" <${process.env.SMTP_USER}>`,
        to: email,
        subject: '✅ Solicitud de crédito APROBADA - IADEY',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
            <div style="background:#264653;color:white;padding:28px;text-align:center;border-radius:10px 10px 0 0;">
              <h1 style="margin:0;">Solicitud Aprobada</h1>
              <p style="margin:8px 0 0;opacity:.9;">Instituto Autónomo de Desarrollo Económico de Yaracuy</p>
            </div>
            <div style="background:white;padding:28px;border:1px solid #eee;border-radius:0 0 10px 10px;">
              <h2 style="color:#264653;">Hola ${nombre || 'emprendedor/a'},</h2>
              <p>Nos complace informarle que su solicitud de crédito ha sido <strong style="color:#2A9D8F;">APROBADA</strong>.</p>
              <p><strong>Expediente:</strong> ${codigoExpediente || 'N/A'}<br/>
                 <strong>Monto:</strong> ${monto || 'N/A'}</p>
              ${bloqueCita}
              <h3 style="color:#264653;margin-top:24px;">Requisitos / documentos a presentar</h3>
              ${listaReq
                ? `<ul style="padding-left:20px;color:#333;">${listaReq}</ul>`
                : '<p>Consulte con IADEY los documentos requeridos para continuar el proceso.</p>'}
              <p style="margin-top:24px;color:#666;font-size:13px;">
                Este mensaje es informativo. Conserve este correo como constancia.
              </p>
            </div>
          </div>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    }

    /**
     * Notifica pre-aprobación: recaudos a consignar + fecha/hora de cita
     */
    async sendPreAprobacionCreditoEmail({
      email,
      nombre,
      numeroSolicitud,
      monto,
      requisitos = [],
      cita = null
    }) {
      if (!this.transporter) await this.initializeTransporter();
      if (!email) throw new Error('Correo del solicitante no disponible');

      const listaReq = (requisitos || [])
        .map((r, i) => {
          const nombreReq = r.nombre || r.nombre_requisito || (typeof r === 'string' ? r : null);
          return nombreReq
            ? `<li style="margin:8px 0;">${i + 1}. ${nombreReq}</li>`
            : '';
        })
        .filter(Boolean)
        .join('');

      const fecha = cita?.fecha || 'por confirmar';
      const hora = cita?.hora || 'por confirmar';

      const mailOptions = {
        from: `"IADEY" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Solicitud de crédito N° ${numeroSolicitud} RECIBIDA - IADEY`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
            <div style="background:#264653;color:white;padding:28px;text-align:center;border-radius:10px 10px 0 0;">
              <h1 style="margin:0;">Solicitud Recibida</h1>
              <p style="margin:8px 0 0;opacity:.9;">Instituto Autónomo de Desarrollo Económico de Yaracuy (IADEY)</p>
            </div>
            <div style="background:white;padding:28px;border:1px solid #eee;border-radius:0 0 10px 10px;">
              <h2 style="color:#264653;margin-top:0;">Estimado(a) Sr(a). ${nombre || 'solicitante'},</h2>
              <p style="line-height:1.6;color:#333;">
                Su solicitud de crédito número <strong style="color:#2A9D8F;">${numeroSolicitud}</strong>
                ha sido <strong>recibida</strong>${monto ? ` (monto: <strong>${monto}</strong>)` : ''}.
              </p>
              <p style="line-height:1.6;color:#333;">
                Debe consignar los siguientes recaudos en la fecha y hora de su cita:
              </p>
              <div style="background:#e8f5f3;padding:16px;border-radius:8px;margin:18px 0;border-left:4px solid #2A9D8F;">
                <p style="margin:0;font-weight:bold;color:#264653;">Cita programada</p>
                <p style="margin:10px 0 0;color:#333;">
                  Día: <strong>${fecha}</strong><br/>
                  Hora: <strong>${hora}</strong>
                  ${cita?.inspector ? `<br/>Inspector: <strong>${cita.inspector}</strong>` : ''}
                </p>
              </div>
              <h3 style="color:#264653;margin-top:24px;">Recaudos / requisitos a consignar</h3>
              ${listaReq
                ? `<ul style="padding-left:22px;color:#333;line-height:1.5;">${listaReq}</ul>`
                : '<p style="color:#666;">Consulte con IADEY los documentos requeridos.</p>'}
              <p style="margin-top:24px;line-height:1.6;color:#333;">
                Le agradecemos presentarse puntualmente con la documentación solicitada
                para continuar el proceso de evaluación.
              </p>
              <p style="margin-top:20px;color:#888;font-size:12px;">
                Este mensaje es informativo. Conserve este correo como constancia de que su solicitud fue recibida.
              </p>
            </div>
          </div>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Correo de pre-aprobación enviado a ${email}`);
      return { success: true, messageId: info.messageId };
    }
}

module.exports = new EmailService();
