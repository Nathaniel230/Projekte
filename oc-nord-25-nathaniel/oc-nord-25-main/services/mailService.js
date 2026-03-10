const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
    if (transporter) return transporter;

    const host = process.env.SMTP_HOST;
    if (!host) {
        throw new Error('SMTP nicht konfiguriert. Bitte SMTP_HOST setzen.');
    }

    console.log('📧 Initialisiere SMTP Transporter mit Host:', host);

    transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
        auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        } : undefined
    });

    return transporter;
}

function buildHtml(order) {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5500';
    const iframeClosed = `${baseUrl}/homeIframe?lng=de`;
    const iframeOpen = `${baseUrl}/homeIframe2?lng=de`;

    return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zahlungsbestätigung</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 30px 20px; }
        .success-icon { background: #28a745; color: white; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px; margin-bottom: 20px; }
        .order-details { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .order-details p { margin: 8px 0; }
        .section-title { color: #667eea; font-size: 20px; margin: 25px 0 15px 0; font-weight: bold; }
        .iframe-box { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 15px; margin: 15px 0; }
        .iframe-box h4 { margin: 0 0 10px 0; color: #495057; font-size: 16px; }
        .code-block { background: #2d2d2d; color: #f8f8f2; padding: 12px; border-radius: 4px; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.4; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 15px 0; font-weight: bold; }
        .divider { border-top: 1px solid #dee2e6; margin: 25px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="success-icon">✓</div>
            <h1>Zahlung erfolgreich!</h1>
            <p>Vielen Dank für Ihr Vertrauen</p>
        </div>
        
        <div class="content">
            <h2 style="color: #28a745; margin-top: 0;">Ihre Bestellung wurde bestätigt</h2>
            
            <div class="order-details">
                <p><strong>📦 Bestellnummer:</strong> ${order.orderId}</p>
                <p><strong>💰 Betrag:</strong> ${order.totalAmount} ${order.currency || 'CHF'}</p>
                <p><strong>📅 Datum:</strong> ${new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <div class="divider"></div>

            <h3 class="section-title">🎯 Nächster Schritt: iFrame einbinden</h3>
            <p>Kopieren Sie einen der folgenden Code-Snippets und fügen Sie ihn in Ihre Website ein:</p>

            <div class="iframe-box">
                <h4>🔴 Geschlossen-Ansicht</h4>
                <div class="code-block">&lt;iframe src="${iframeClosed}" 
    style="border:0;width:100%;max-width:420px;height:200px;" 
    loading="lazy"&gt;
&lt;/iframe&gt;</div>
            </div>

            <div class="iframe-box">
                <h4>🟢 Geöffnet-Ansicht</h4>
                <div class="code-block">&lt;iframe src="${iframeOpen}" 
    style="border:0;width:100%;max-width:420px;height:200px;" 
    loading="lazy"&gt;
&lt;/iframe&gt;</div>
            </div>

            <div style="background: #e7f3ff; border-left: 4px solid #0066cc; padding: 12px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0;"><strong>💡 Tipp:</strong> Sie können die Sprache über den Parameter <code>?lng=de|en|fr|it|es</code> steuern.</p>
            </div>

            <a href="${baseUrl}/user/bestellhistorie" class="button">Zur Bestellübersicht</a>

            <div class="divider"></div>

            <p style="color: #6c757d;">Bei Fragen stehen wir Ihnen gerne zur Verfügung. Antworten Sie einfach auf diese E-Mail.</p>
        </div>

        <div class="footer">
            <p><strong>OpenClose</strong></p>
            <p>© ${new Date().getFullYear()} OpenClose. Alle Rechte vorbehalten.</p>
        </div>
    </div>
</body>
</html>
    `;
}

async function sendOrderConfirmation(order) {
    try {
        console.log('📧 sendOrderConfirmation aufgerufen für Order:', order?.orderId);

        if (!order || !order.customerEmail) {
            console.warn('⚠️ Keine E-Mail versendet: order oder customerEmail fehlt');
            return;
        }

        console.log('📧 Versuche Mail-Transporter zu initialisieren...');
        const tx = getTransporter();

        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@openclose.local',
            to: order.customerEmail,
            subject: 'Ihre Zahlung war erfolgreich – iFrame Einrichtung',
            html: buildHtml(order)
        };

        console.log('📧 Sende Mail an:', order.customerEmail, 'von:', mailOptions.from);
        const info = await tx.sendMail(mailOptions);
        console.log('📧 ✅ Bestätigungs-Mail erfolgreich gesendet an:', order.customerEmail, '(MessageId:', info.messageId, ')');
    } catch (err) {
        console.error('❌ Fehler beim Senden der Bestätigungs-Mail:');
        console.error('   Fehler-Nachricht:', err.message);
        console.error('   Fehler-Details:', err);
    }
}

/**
 * Baut HTML für Subscription-Erinnerungsmail
 * @param {Object} user - User mit E-Mail, Name und subscriptionEndDate
 * @param {number} daysRemaining - Tage bis zum Ablauf
 */
function buildSubscriptionReminderHtml(user, daysRemaining) {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5500';
    const renewUrl = `${baseUrl}/shop`;
    const loginUrl = `${baseUrl}/login`;
    const endDate = new Date(user.subscriptionEndDate).toLocaleDateString('de-DE', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Abonnement läuft bald ab</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 30px 20px; }
        .warning-icon { background: #ff6b6b; color: white; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px; margin-bottom: 20px; }
        .info-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .info-box p { margin: 8px 0; }
        .button { display: inline-block; background: #667eea; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 15px 0; font-weight: bold; }
        .button:hover { background: #5568d3; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
        .highlight { color: #ff6b6b; font-weight: bold; font-size: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="warning-icon">⏰</div>
            <h1>Ihr Abonnement läuft bald ab</h1>
        </div>
        
        <div class="content">
            <p>Hallo ${user.name || user.email},</p>
            
            <p>Dies ist eine freundliche Erinnerung, dass Ihr <strong>OpenClose Abonnement</strong> in <span class="highlight">${daysRemaining} Tagen</span> abläuft.</p>
            
            <div class="info-box">
                <p><strong>📅 Ablaufdatum:</strong> ${endDate}</p>
                <p><strong>⏳ Verbleibende Tage:</strong> ${daysRemaining}</p>
            </div>

            <p>Um Ihren Service ohne Unterbrechung fortzusetzen, können Sie Ihr Abonnement jetzt verlängern:</p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${renewUrl}" class="button">🔄 Jetzt verlängern</a>
            </div>

            <p style="margin-top: 30px; color: #6c757d; font-size: 14px;">
                <strong>Was passiert, wenn mein Abonnement abläuft?</strong><br>
                Nach Ablauf wird Ihr iFrame deaktiviert und auf Ihrer Website nicht mehr angezeigt. 
                Sie können jederzeit wieder verlängern, um den Service zu reaktivieren.
            </p>

            <div style="background: #e7f3ff; border-left: 4px solid #0066cc; padding: 12px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0;"><strong>💡 Tipp:</strong> Melden Sie sich in Ihrem <a href="${loginUrl}">Account</a> an, um alle Details zu Ihrem Abonnement zu sehen.</p>
            </div>

            <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung. Antworten Sie einfach auf diese E-Mail.</p>
            
            <p style="margin-top: 30px;">Mit freundlichen Grüßen,<br>Ihr OpenClose Team</p>
        </div>

        <div class="footer">
            <p><strong>OpenClose</strong></p>
            <p>© ${new Date().getFullYear()} OpenClose. Alle Rechte vorbehalten.</p>
        </div>
    </div>
</body>
</html>
    `;
}

/**
 * Sendet Erinnerungs-E-Mail für ablaufende Abonnements
 * @param {Object} user - User-Objekt mit email, name, subscriptionEndDate
 * @param {number} daysRemaining - Tage bis zum Ablauf (30 oder 7)
 */
async function sendSubscriptionReminder(user, daysRemaining) {
    try {
        console.log(`📧 sendSubscriptionReminder: Mail an ${user.email}, ${daysRemaining} Tage verbleibend`);

        if (!user || !user.email) {
            console.warn('⚠️ Keine E-Mail versendet: user oder email fehlt');
            return;
        }

        const tx = getTransporter();

        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@openclose.local',
            to: user.email,
            subject: `⏰ Ihr OpenClose Abonnement läuft in ${daysRemaining} Tagen ab`,
            html: buildSubscriptionReminderHtml(user, daysRemaining)
        };

        const info = await tx.sendMail(mailOptions);
        console.log(`📧 ✅ Erinnerungs-Mail erfolgreich gesendet an: ${user.email} (MessageId: ${info.messageId})`);
        return true;
    } catch (err) {
        console.error('❌ Fehler beim Senden der Erinnerungs-Mail:');
        console.error('   Fehler-Nachricht:', err.message);
        console.error('   Fehler-Details:', err);
        return false;
    }
}

module.exports = {
    sendOrderConfirmation,
    sendSubscriptionReminder
};
