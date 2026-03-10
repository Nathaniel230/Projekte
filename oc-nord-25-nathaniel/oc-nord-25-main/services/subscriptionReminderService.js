"use strict";

const mongoose = require('mongoose');
const { sendSubscriptionReminder } = require('./mailService');

/**
 * Findet Benutzer, deren Abonnement in X Tagen abläuft
 * @param {number} daysUntilExpiry - Anzahl der Tage bis zum Ablauf (z.B. 30 oder 7)
 * @returns {Array} Array von Benutzern mit ablaufenden Abonnements
 */
async function getUsersWithExpiringSubscriptions(daysUntilExpiry) {
    try {
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        // Berechne den Tagesbereich (Start/Ende) für das Ziel-Datum
        // Beispiel: heute + 30 Tage -> 00:00 bis 23:59:59 dieses Tages
        const now = new Date();
        const targetStart = new Date(now);
        targetStart.setHours(0, 0, 0, 0);
        targetStart.setDate(targetStart.getDate() + daysUntilExpiry);

        const targetEnd = new Date(targetStart);
        targetEnd.setDate(targetEnd.getDate() + 1);

        console.log(`🔍 Suche Benutzer mit Ablaufdatum in ${daysUntilExpiry} Tagen (Tagesfenster ${targetStart.toISOString()} - ${targetEnd.toISOString()})`);
        
        // Feld für die Markierung
        const reminderField = daysUntilExpiry === 30 ? 'reminder30DaysSent' : 'reminder7DaysSent';
        
        // Finde Benutzer, deren subscriptionEndDate in ca. X Tagen ist
        // und die noch keine Erinnerung erhalten haben
        const users = await usersCollection.find({
            subscriptionEndDate: {
                $gte: targetStart,
                $lt: targetEnd
            },
            [reminderField]: { $exists: false } // Noch keine Erinnerung gesendet
        }).toArray();
        
        console.log(`✅ ${users.length} Benutzer gefunden mit Ablauf in ~${daysUntilExpiry} Tagen (ohne bereits gesendete Erinnerung)`);
        return users;
    } catch (error) {
        console.error('❌ Fehler beim Abrufen ablaufender Abonnements:', error);
        return [];
    }
}

/**
 * Sendet Erinnerungen an alle Benutzer mit ablaufenden Abonnements
 * @param {number} daysUntilExpiry - Anzahl der Tage (30 oder 7)
 */
async function sendRemindersForExpiringSubscriptions(daysUntilExpiry) {
    try {
        console.log(`\n🔔 Starte Erinnerungsprozess für Abonnements mit ${daysUntilExpiry} Tagen Restlaufzeit...`);
        
        const users = await getUsersWithExpiringSubscriptions(daysUntilExpiry);
        
        if (users.length === 0) {
            console.log(`ℹ️ Keine Benutzer mit Ablauf in ${daysUntilExpiry} Tagen gefunden.`);
            return { sent: 0, failed: 0 };
        }
        
        let sentCount = 0;
        let failedCount = 0;
        
        for (const user of users) {
            try {
                const success = await sendSubscriptionReminder(user, daysUntilExpiry);
                if (success) {
                    sentCount++;
                    // Markiere, dass Erinnerung gesendet wurde (optional)
                    await markReminderSent(user._id, daysUntilExpiry);
                } else {
                    failedCount++;
                }
                
                // Kleine Pause zwischen E-Mails, um SMTP-Server nicht zu überlasten
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`❌ Fehler beim Senden der Erinnerung an ${user.email}:`, error);
                failedCount++;
            }
        }
        
        console.log(`\n📊 Erinnerungs-Statistik (${daysUntilExpiry} Tage):`);
        console.log(`   ✅ Erfolgreich versendet: ${sentCount}`);
        console.log(`   ❌ Fehlgeschlagen: ${failedCount}`);
        console.log(`   📧 Gesamt: ${users.length}\n`);
        
        return { sent: sentCount, failed: failedCount, total: users.length };
    } catch (error) {
        console.error('❌ Fehler im Erinnerungsprozess:', error);
        return { sent: 0, failed: 0, total: 0 };
    }
}

/**
 * Markiert im User-Dokument, dass eine Erinnerung gesendet wurde (optional)
 * Verhindert doppelte E-Mails
 */
async function markReminderSent(userId, daysRemaining) {
    try {
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        const fieldName = daysRemaining === 30 
            ? 'reminder30DaysSent' 
            : 'reminder7DaysSent';
        
        await usersCollection.updateOne(
            { _id: userId },
            { 
                $set: { 
                    [fieldName]: new Date(),
                    updatedAt: new Date()
                } 
            }
        );
    } catch (error) {
        console.error('Fehler beim Markieren der Erinnerung:', error);
    }
}

/**
 * Hauptfunktion für minütliche Prüfung (für Tests)
 * Sendet Erinnerungen für 30 und 7 Tage sobald die Marke erreicht wird
 */
async function runDailySubscriptionCheck() {
    console.log('\n🚀 ==========================================');
     console.log('🚀 Starte minütliche Abonnement-Prüfung');
    console.log('🚀 Zeitpunkt:', new Date().toLocaleString('de-DE'));
    console.log('🚀 ==========================================\n');
    
    try {
        // Prüfe 30-Tage-Ablauf
        await sendRemindersForExpiringSubscriptions(30);
        
        // Prüfe 7-Tage-Ablauf
        await sendRemindersForExpiringSubscriptions(7);
        
        console.log('✅ Minütliche Abonnement-Prüfung abgeschlossen\n');
    } catch (error) {
        console.error('❌ Fehler bei der minütlichen Abonnement-Prüfung:', error);
    }
}

module.exports = {
    getUsersWithExpiringSubscriptions,
    sendRemindersForExpiringSubscriptions,
    runDailySubscriptionCheck
};
