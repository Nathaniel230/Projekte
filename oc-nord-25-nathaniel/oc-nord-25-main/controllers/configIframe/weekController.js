"use strict";
const Week = require('../../models/configIframe/weekModel');
const Weekday = require('../../models/configIframe/weekdayModel');
const SpecialDay = require('../../models/configIframe/specialDayModel');
const SpecialDayReason = require('../../models/configIframe/specialDayReasonModel');
const { Outofplan, OutofplanText } = require('../../models/configIframe/outofplanModel');

// Simple server-side controller to render the wochenplan page
const renderWochenplan = (req, res) => {
    // Debug logging
    console.log('=== Wochenplan Request ===');
    console.log('Session:', req.session);
    console.log('Session ID:', req.sessionID);
    console.log('User:', req.session?.user);
    console.log('LoggedIn:', req.session?.loggedIn);

    // Pass authentication data to template
    const isLoggedIn = req.session?.loggedIn || false;
    const user = req.session?.user || null;
    const isAdmin = user?.isAdmin || user?.admin || false;

    console.log('Rendering with:', { isLoggedIn, user: user?.email, isAdmin });
    console.log('=========================');

    // Renders the view located at views/configIframe/Wochenplan.html
    res.render('configIframe/Wochenplan', {
        isLoggedIn: isLoggedIn,
        user: user,
        isAdmin: isAdmin,
        language: req.language
    });
}

// API: Get week data
const getWeek = async (req, res) => {
    try {
        const year = parseInt(req.params.year);
        const week = parseInt(req.params.week);
        // Fix: Use _id as primary if available, consistent with saveWeek
        const customerId = req.session?.user?._id?.toString() || req.session?.user?.id?.toString() || 'demo-user';
        const isEffective = req.query.effective === 'true';

        let weekDoc = await Week.findOne({ customerId, year, weekNumber: week });

        // If no specific week found, try to load standard week (year=0, week=0)
        if (!weekDoc) {
            weekDoc = await Week.findOne({ customerId, year: 0, weekNumber: 0 });
        }

        if (!weekDoc) {
            return res.json({
                weekData: {},
                decoupled: false
            });
        }

        const weekdays = await Weekday.find({ weekId: weekDoc._id });

        // Transform to frontend format
        const weekData = {};
        const days = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];

        days.forEach((dayName, index) => {
            const daySlots = weekdays.filter(w => w.dayIndex === index);

            if (daySlots.length > 0 && daySlots[0].isClosed) {
                weekData[dayName] = { closed: true };
            } else {
                const timeSlots = daySlots.map(slot => ({
                    open: slot.openTime,
                    close: slot.closeTime
                })).filter(s => s.open && s.close);

                weekData[dayName] = {
                    closed: false,
                    timeSlots: timeSlots.length ? timeSlots : [{}]
                };
            }
        });

        // --- EFFECTIVE MODE LOGIC ---
        if (isEffective && parseInt(year) > 0) {
            // 1. Calculate dates (ISO 8601)
            const simpleDate = new Date(Date.UTC(year, 0, 4));
            const dayOfWeek = simpleDate.getUTCDay() || 7;
            const week1Monday = new Date(simpleDate);
            week1Monday.setUTCDate(simpleDate.getUTCDate() - dayOfWeek + 1);
            const currentMonday = new Date(week1Monday);
            currentMonday.setUTCDate(currentMonday.getUTCDate() + (week - 1) * 7);

            // 2. Fetch Overrides
            const specialDays = await SpecialDay.find({ customerId });
            const outofplanEntries = await Outofplan.find({ customerId });

            // 3. Apply Overrides
            days.forEach((dayName, index) => {
                const date = new Date(currentMonday);
                date.setUTCDate(date.getUTCDate() + index);
                const dateStr = date.toISOString().split('T')[0];

                // Special Days
                const specialDay = specialDays.find(sd => dateStr >= sd.fromDate && dateStr <= sd.toDate);
                if (specialDay) {
                    if (specialDay.status === 'geschlossen') {
                        weekData[dayName] = { closed: true, timeSlots: [], reason: specialDay.reason, isOverride: true };
                    } else if (specialDay.status === 'offen') {
                        if (weekData[dayName].closed) {
                            weekData[dayName] = { closed: false, timeSlots: [{}], reason: specialDay.reason, isOverride: true };
                        }
                    }
                }

                // Out of Plan
                const outofplan = outofplanEntries.find(entry => {
                    const from = entry.datumVon.toISOString().split('T')[0];
                    const to = entry.datumBis.toISOString().split('T')[0];
                    return dateStr >= from && dateStr <= to;
                });

                if (outofplan) {
                    if (outofplan.offen) {
                        if (weekData[dayName].closed) {
                            weekData[dayName] = { closed: false, timeSlots: [{}], reason: 'Ausserplanmässig', isOverride: true };
                        }
                    } else {
                        weekData[dayName] = { closed: true, timeSlots: [], reason: 'Ausserplanmässig', isOverride: true };
                    }
                }
            });
        }

        // If we loaded the standard week (year=0), we should return decoupled: false
        // regardless of what the standard week doc says (it should be false anyway).
        // If we loaded a specific week, we return its decoupled status.
        const isStandard = weekDoc.year === 0 && weekDoc.weekNumber === 0;

        res.json({
            weekData,
            decoupled: isStandard ? false : weekDoc.decoupled
        });

    } catch (error) {
        console.error('Error getting week:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// API: Save week data
const saveWeek = async (req, res) => {
    console.log('=== saveWeek called ===');
    console.log('Params:', req.params);
    // console.log('Body:', JSON.stringify(req.body, null, 2));

    try {
        const year = parseInt(req.params.year);
        const week = parseInt(req.params.week);
        const { weekData, decoupled } = req.body;
        // Fix: Use _id as primary if available, fallback to id, then demo-user
        const customerId = req.session?.user?._id?.toString() || req.session?.user?.id?.toString() || 'demo-user';

        if (isNaN(year) || isNaN(week)) {
            return res.status(400).json({ error: 'Invalid year or week parameters' });
        }

        if (!weekData) {
            console.error('Missing weekData in request body');
            return res.status(400).json({ error: 'Missing weekData' });
        }

        // If user wants to "re-couple" (decoupled = false), we delete the specific week entry
        // so it falls back to the standard week.
        // BUT: Never delete the standard week (0/0)!
        if (decoupled === false && (year !== 0 || week !== 0)) {
            const existingWeek = await Week.findOne({ customerId, year, weekNumber: week });
            if (existingWeek) {
                await Weekday.deleteMany({ weekId: existingWeek._id });
                await Week.deleteOne({ _id: existingWeek._id });
                console.log(`Week ${year}/${week} deleted (reverted to standard)`);
            }
            return res.json({ success: true });
        }

        // Find or create week
        let weekDoc = await Week.findOne({ customerId, year, weekNumber: week });

        if (!weekDoc) {
            console.log('Creating new week document');
            weekDoc = new Week({
                customerId,
                year,
                weekNumber: week,
                decoupled: decoupled || false
            });
        } else {
            console.log('Updating existing week document');
            weekDoc.decoupled = decoupled;
        }
        await weekDoc.save();
        console.log('Week document saved:', weekDoc._id);

        // Clear existing weekdays
        const deleteResult = await Weekday.deleteMany({ weekId: weekDoc._id });
        console.log('Deleted existing weekdays:', deleteResult.deletedCount);

        // Insert new weekdays
        const days = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];
        const newWeekdays = [];

        days.forEach((dayName, index) => {
            const dayData = weekData[dayName];
            if (!dayData) return;

            if (dayData.closed) {
                newWeekdays.push({
                    weekId: weekDoc._id,
                    dayIndex: index,
                    isClosed: true
                });
            } else if (dayData.timeSlots && dayData.timeSlots.length > 0) {
                dayData.timeSlots.forEach(slot => {
                    if (slot.open && slot.close) {
                        newWeekdays.push({
                            weekId: weekDoc._id,
                            dayIndex: index,
                            openTime: slot.open,
                            closeTime: slot.close,
                            isClosed: false
                        });
                    }
                });
            }
        });

        console.log(`Preparing to insert ${newWeekdays.length} weekdays`);

        if (newWeekdays.length > 0) {
            await Weekday.insertMany(newWeekdays);
            console.log('Weekdays inserted successfully');
        }

        // If we just saved the Standard Week (0/0), clean up any non-decoupled specific weeks
        // to ensure they fall back to this new standard.
        if (year === 0 && week === 0) {
            console.log('Standard week saved. Cleaning up coupled weeks...');
            // Find weeks that are NOT explicitly decoupled (meaning they should follow standard)
            // We delete them so the fallback mechanism kicks in.
            const coupledWeeks = await Week.find({
                customerId,
                $or: [{ decoupled: false }, { decoupled: { $exists: false } }],
                $nor: [{ year: 0, weekNumber: 0 }] // Don't delete self
            });

            for (const wk of coupledWeeks) {
                await Weekday.deleteMany({ weekId: wk._id });
                await Week.deleteOne({ _id: wk._id });
                console.log(`Deleted coupled week ${wk.year}/${wk.weekNumber} to enforce standard.`);
            }
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Error saving week:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Week already exists (Duplicate Key Error)' });
        }
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

// API: Get all decoupled weeks
const getDecoupledWeeks = async (req, res) => {
    try {
        // Fix: Use _id as primary if available, consistent with saveWeek
        const customerId = req.session?.user?._id?.toString() || req.session?.user?.id?.toString() || 'demo-user';
        console.log(`getDecoupledWeeks called for customer: ${customerId}`);

        // Fetch all weeks for customer to debug/ensure we don't miss any due to query issues
        // We filter in memory to avoid potential type mismatches in DB query
        const allWeeks = await Week.find({ customerId });

        // Filter: must be decoupled AND not the standard week (year 0)
        const weeks = allWeeks.filter(w => {
            // Relaxed check: If a week document exists for a specific year (not 0), treat it as decoupled.
            // This handles cases where decoupled flag might be false/missing but the document exists.
            // const isDecoupled = w.decoupled === true; 
            const isNotStandard = Number(w.year) !== 0;
            return isNotStandard; // && isDecoupled;
        });

        console.log(`Found ${allWeeks.length} total weeks, filtered to ${weeks.length} decoupled weeks`);

        // Get all week IDs
        const weekIds = weeks.map(w => w._id);

        // Find all weekdays for these weeks
        const weekdays = await Weekday.find({ weekId: { $in: weekIds } });

        // Fetch Out of Plan entries for validation
        const outofplanEntries = await Outofplan.find({ customerId });

        const decoupledMap = {};
        const dayNames = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];

        // Helper to get date from year, week, dayIndex
        const getDateFromWeek = (year, week, dayIndex) => {
            const simple = new Date(year, 0, 1 + (week - 1) * 7);
            const dow = simple.getDay();
            const ISOweekStart = simple;
            if (dow <= 4)
                ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
            else
                ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());

            // ISOweekStart is Monday of the week
            const dayDate = new Date(ISOweekStart);
            dayDate.setDate(dayDate.getDate() + dayIndex);
            return dayDate.toISOString().split('T')[0];
        };

        weeks.forEach(w => {
            // Group slots by dayIndex
            const slotsByDay = {};
            const weekDays = weekdays.filter(wd => wd.weekId.toString() === w._id.toString());

            weekDays.forEach(wd => {
                if (!slotsByDay[wd.dayIndex]) slotsByDay[wd.dayIndex] = [];
                slotsByDay[wd.dayIndex].push(wd);
            });

            const daysWithTimes = [];
            let hasOpenButNoTimes = false;

            // Check for warnings (Open but no times)
            for (let i = 0; i < 7; i++) {
                const slots = slotsByDay[i] || [];
                if (slots.length === 0) {
                    // No entry in DB means Open but no times (default state)
                    hasOpenButNoTimes = true;
                    break;
                }
                // Check if explicitly closed
                if (slots.some(s => s.isClosed)) {
                    continue;
                }
                // Check if has valid times
                const valid = slots.some(s => s.openTime && s.closeTime);
                if (!valid) {
                    hasOpenButNoTimes = true;
                    break;
                }
            }

            dayNames.forEach((dayName, dayIndex) => {
                const slots = slotsByDay[dayIndex] || [];
                const validSlots = slots.filter(s => !s.isClosed && s.openTime && s.closeTime);

                if (validSlots.length === 0) return; // No times

                // Check Out of Plan
                const dateStr = getDateFromWeek(w.year, w.weekNumber, dayIndex);
                const relevantEntry = outofplanEntries.find(entry => {
                    const from = entry.datumVon.toISOString().split('T')[0];
                    const to = entry.datumBis.toISOString().split('T')[0];
                    return dateStr >= from && dateStr <= to && entry.offen;
                });

                if (relevantEntry) {
                    let reqStart = '00:00';
                    let reqEnd = '23:59';
                    const fromDate = relevantEntry.datumVon.toISOString().split('T')[0];
                    const toDate = relevantEntry.datumBis.toISOString().split('T')[0];

                    if (dateStr === fromDate) reqStart = relevantEntry.zeitVon;
                    if (dateStr === toDate) reqEnd = relevantEntry.zeitBis;

                    // Calculate actual start/end from RELEVANT slots (overlapping with requirement)
                    let actualStart = '23:59';
                    let actualEnd = '00:00';
                    let hasRelevantSlots = false;

                    validSlots.forEach(s => {
                        // Overlap condition: slotStart < reqEnd && slotEnd > reqStart
                        if (s.openTime < reqEnd && s.closeTime > reqStart) {
                            hasRelevantSlots = true;
                            if (s.openTime < actualStart) actualStart = s.openTime;
                            if (s.closeTime > actualEnd) actualEnd = s.closeTime;
                        }
                    });

                    // Strict validation: The outer boundaries of RELEVANT slots must match exactly
                    if (!hasRelevantSlots || actualStart !== reqStart || actualEnd !== reqEnd) {
                        return; // Invalid, don't add to daysWithTimes
                    }
                }

                daysWithTimes.push(dayName);
            });

            decoupledMap[`${w.year}_${w.weekNumber}`] = {
                decoupled: true,
                daysWithTimes: daysWithTimes,
                hasOpenButNoTimes: hasOpenButNoTimes
            };
        });

        res.json(decoupledMap);
    } catch (error) {
        console.error('Error getting decoupled weeks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// API: Save standard week (apply to all non-decoupled weeks)
const saveStandardWeek = async (req, res) => {
    try {
        const { weekData } = req.body;
        // Fix: Use _id as primary if available
        const customerId = req.session?.user?._id?.toString() || req.session?.user?.id?.toString() || 'demo-user';

        // 1. Save/Update the Standard Week (Year 0, Week 0)
        let standardWeek = await Week.findOne({ customerId, year: 0, weekNumber: 0 });
        if (!standardWeek) {
            standardWeek = new Week({
                customerId,
                year: 0,
                weekNumber: 0,
                decoupled: false
            });
        }
        await standardWeek.save();

        // Update weekdays for standard week
        await Weekday.deleteMany({ weekId: standardWeek._id });

        const days = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];
        const newWeekdays = [];

        days.forEach((dayName, index) => {
            const dayData = weekData[dayName];
            if (!dayData) return;

            if (dayData.closed) {
                newWeekdays.push({
                    weekId: standardWeek._id,
                    dayIndex: index,
                    isClosed: true
                });
            } else if (dayData.timeSlots && dayData.timeSlots.length > 0) {
                dayData.timeSlots.forEach(slot => {
                    if (slot.open && slot.close) {
                        newWeekdays.push({
                            weekId: standardWeek._id,
                            dayIndex: index,
                            openTime: slot.open,
                            closeTime: slot.close,
                            isClosed: false
                        });
                    }
                });
            }
        });

        if (newWeekdays.length > 0) {
            await Weekday.insertMany(newWeekdays);
        }

        // 2. Cleanup: Delete ONLY weeks that are NOT decoupled.
        // This ensures the Standard Plan propagates to all weeks that haven't been explicitly separated.
        // Decoupled weeks (exceptions) will be PRESERVED.

        const weeksToDelete = await Week.find({
            customerId,
            decoupled: false, // Only target weeks that are still "attached"
            $or: [
                { year: { $ne: 0 } },
                { weekNumber: { $ne: 0 } }
            ]
        });

        if (weeksToDelete.length > 0) {
            const weekIds = weeksToDelete.map(w => w._id);

            // Delete associated weekdays first
            await Weekday.deleteMany({ weekId: { $in: weekIds } });

            // Delete the weeks
            await Week.deleteMany({ _id: { $in: weekIds } });

            console.log(`Standard Plan Saved: Updated ${weekIds.length} standard-compliant weeks. Decoupled weeks were preserved.`);
        } else {
            console.log('Standard Plan Saved: No dependent weeks found to update.');
        }

        res.json({ success: true, message: 'Standard week saved and applied (inefficient copies removed).' });

    } catch (error) {
        console.error('Error saving standard week:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Week collision detected (Duplicate Key Error)' });
        }
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

// API: Get special days
const getSpecialDays = async (req, res) => {
    try {
        const customerId = req.session?.user?._id?.toString() || req.session?.user?.id?.toString() || 'demo-user';
        const specialDays = await SpecialDay.find({ customerId });

        // Fetch reasons for each special day
        const result = await Promise.all(specialDays.map(async (day) => {
            const reasons = await SpecialDayReason.find({ specialDayId: day._id });
            const reasonMap = {};
            reasons.forEach(r => reasonMap[r.language] = r.content);

            // Determine display reason
            let displayReason = '';
            if (reasonMap['de']) {
                displayReason = reasonMap['de'];
            } else {
                // Get first available non-empty reason
                const availableReasons = Object.values(reasonMap).filter(r => r && r.trim() !== '');
                if (availableReasons.length > 0) {
                    displayReason = availableReasons[0];
                }
            }

            return {
                id: day._id, // Use MongoDB ID
                fromDate: day.dateFrom.toISOString().split('T')[0],
                toDate: day.dateTo.toISOString().split('T')[0],
                status: day.isOpen ? 'offen' : 'geschlossen',
                reason: displayReason,
                reasons: reasonMap // Full map for editing
            };
        }));

        res.json(result);
    } catch (error) {
        console.error('Error getting special days:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// API: Save special days
const saveSpecialDays = async (req, res) => {
    try {
        const { specialDays } = req.body;
        const customerId = req.session?.user?._id?.toString() || req.session?.user?.id?.toString() || 'demo-user';

        // Full sync: Delete all and recreate
        const existingDays = await SpecialDay.find({ customerId });
        const existingIds = existingDays.map(d => d._id);
        await SpecialDayReason.deleteMany({ specialDayId: { $in: existingIds } });
        await SpecialDay.deleteMany({ customerId });

        for (const day of specialDays) {
            const newDay = new SpecialDay({
                customerId,
                dateFrom: new Date(day.fromDate),
                dateTo: new Date(day.toDate),
                isOpen: day.status === 'offen'
            });
            await newDay.save();

            // Save reasons
            const reasonsToSave = day.reasons || { de: day.reason };

            // Ensure reasonsToSave is an object and has content
            if (reasonsToSave && typeof reasonsToSave === 'object') {
                const reasonDocs = Object.entries(reasonsToSave)
                    .filter(([lang, text]) => text && text.trim() !== '') // Filter empty strings
                    .map(([lang, text]) => ({
                        specialDayId: newDay._id,
                        language: lang,
                        content: text.trim()
                    }));

                if (reasonDocs.length > 0) {
                    await SpecialDayReason.insertMany(reasonDocs);
                }
            } else if (day.reason && day.reason.trim() !== '') {
                // Fallback if reasons object is missing but simple reason exists
                await SpecialDayReason.create({
                    specialDayId: newDay._id,
                    language: 'de', // Default to German
                    content: day.reason.trim()
                });
            }
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Error saving special days:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// API: Get public current week data (for iframe)
const getPublicCurrentWeek = async (req, res) => {
    try {
        const customerId = req.query.uid || 'demo-user';
        const now = new Date();

        // Calculate ISO week
        const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        const year = d.getUTCFullYear();

        // 1. Calculate dates for the week
        const simpleDate = new Date(Date.UTC(year, 0, 4));
        const dayOfWeek = simpleDate.getUTCDay() || 7;
        const week1Monday = new Date(simpleDate);
        week1Monday.setUTCDate(simpleDate.getUTCDate() - dayOfWeek + 1);
        const currentMonday = new Date(week1Monday);
        currentMonday.setUTCDate(currentMonday.getUTCDate() + (weekNo - 1) * 7);

        // 2. Fetch Week Data
        let weekDoc = await Week.findOne({ customerId, year, weekNumber: weekNo });
        if (!weekDoc) {
            weekDoc = await Week.findOne({ customerId, year: 0, weekNumber: 0 });
        }

        // Fallback: If user has no data, check if they have data under 'demo-user' (Legacy/Migration)
        if (!weekDoc && customerId !== 'demo-user') {
            weekDoc = await Week.findOne({ customerId: 'demo-user', year: 0, weekNumber: 0 });
        }

        let weekdays = [];
        if (weekDoc) {
            weekdays = await Weekday.find({ weekId: weekDoc._id });
        }

        // Fetch STANDARD Week Data (Week 0) for overrides referencing "Standard Plan"
        let standardWeekDoc = await Week.findOne({ customerId, year: 0, weekNumber: 0 });
        // Fallback for Standard Week as well
        if (!standardWeekDoc && customerId !== 'demo-user') {
            standardWeekDoc = await Week.findOne({ customerId: 'demo-user', year: 0, weekNumber: 0 });
        }

        let standardWeekdays = [];
        if (standardWeekDoc) {
            standardWeekdays = await Weekday.find({ weekId: standardWeekDoc._id });
        } else {
            // Fallback if no standard week exists: Treat as closed-standard?
            standardWeekdays = [];
        }

        // 3. Fetch Overrides
        const specialDays = await SpecialDay.find({ customerId });
        const outofplanEntries = await Outofplan.find({ customerId });

        // Fetch texts for outofplan
        const outofplanIds = outofplanEntries.map(e => e._id);
        const outofplanTexts = await OutofplanText.find({ idAusserplanmaesiges: { $in: outofplanIds } });

        // 4. Build Week Data & Check Current Status
        const days = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'];
        const weekData = {};
        let isOpenNow = false;

        // Current time in minutes for comparison
        const currentDayIndex = (now.getDay() + 6) % 7; // 0=Mon, 6=Sun
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        for (let index = 0; index < days.length; index++) {
            const dayName = days[index];
            const date = new Date(currentMonday);
            date.setUTCDate(date.getUTCDate() + index);
            const dateStr = date.toISOString().split('T')[0];

            let dayStatus = {
                date: dateStr,
                closed: false,
                timeSlots: []
            };

            // Check Special Days
            const specialDay = specialDays.find(sd => {
                const sdFrom = sd.dateFrom.toISOString().split('T')[0];
                const sdTo = sd.dateTo.toISOString().split('T')[0];
                return dateStr >= sdFrom && dateStr <= sdTo;
            });

            if (specialDay) {
                if (!specialDay.isOpen) {
                    dayStatus.closed = true;
                    dayStatus.timeSlots = []; // Ensure no times shown
                    dayStatus.reason = specialDay.reason || 'Special Day';
                } else {
                    // Open according to Standard Plan
                    // Find standard slots for this day index
                    const stdSlots = standardWeekdays.filter(w => w.dayIndex === index && !w.isClosed);

                    if (stdSlots.length > 0) {
                        dayStatus.closed = false;
                        dayStatus.timeSlots = stdSlots.map(slot => ({
                            open: slot.openTime,
                            close: slot.closeTime
                        })).filter(s => s.open && s.close).sort((a, b) => a.open.localeCompare(b.open));
                    } else {
                        // Standard is closed
                        dayStatus.closed = true;
                        dayStatus.timeSlots = [];
                    }
                    dayStatus.reason = specialDay.reason || 'Spezialöffnung';
                    dayStatus.isOverride = true;
                }
            }

            // Standard Times
            if (!dayStatus.closed) {
                const daySlots = weekdays.filter(w => w.dayIndex === index);
                if (daySlots.length > 0 && daySlots[0].isClosed) {
                    dayStatus.closed = true;
                } else {
                    dayStatus.timeSlots = daySlots.map(slot => ({
                        open: slot.openTime,
                        close: slot.closeTime
                    })).filter(s => s.open && s.close);

                    // Safety Check: If no valid slots found, mark as closed
                    if (dayStatus.timeSlots.length === 0) {
                        dayStatus.closed = true;
                    }
                }
            }

            // Check Outofplan (Kundenanzeige) - Overrides everything
            const outofplan = outofplanEntries.find(entry => {
                const from = entry.datumVon.toISOString().split('T')[0];
                const to = entry.datumBis.toISOString().split('T')[0];
                return dateStr >= from && dateStr <= to;
            });

            if (outofplan) {
                // Find reason text (prefer DE, fallback to any)
                const textEntry = outofplanTexts.find(t => t.idAusserplanmaesiges.toString() === outofplan._id.toString() && t.sprache === 'de')
                    || outofplanTexts.find(t => t.idAusserplanmaesiges.toString() === outofplan._id.toString());
                const reasonText = textEntry ? textEntry.inhalt : 'Ausserplanmässig';

                if (outofplan.offen) {
                    // Force Open according to Standard Plan
                    const stdSlots = standardWeekdays.filter(w => w.dayIndex === index && !w.isClosed);

                    if (stdSlots.length > 0) {
                        dayStatus.closed = false;
                        dayStatus.timeSlots = stdSlots.map(slot => ({
                            open: slot.openTime,
                            close: slot.closeTime
                        })).filter(s => s.open && s.close).sort((a, b) => a.open.localeCompare(b.open));
                    } else {
                        // Standard is closed, but user requested OPEN out-of-plan.
                        // Fallback to the times defined in outofplan entry (default 00:00-23:59)
                        dayStatus.closed = false;
                        dayStatus.timeSlots = [{
                            open: outofplan.zeitVon || '00:00',
                            close: outofplan.zeitBis || '23:59'
                        }];
                    }
                    dayStatus.reason = reasonText;
                    dayStatus.isOverride = true;
                } else {
                    // Force Closed
                    dayStatus.closed = true;
                    dayStatus.timeSlots = [];
                    dayStatus.reason = reasonText;
                    dayStatus.isOverride = true;
                }
            }

            weekData[dayName] = dayStatus;

            // Check if open NOW
            if (index === currentDayIndex && !dayStatus.closed) {
                for (const slot of dayStatus.timeSlots) {
                    const [openH, openM] = slot.open.split(':').map(Number);
                    const [closeH, closeM] = slot.close.split(':').map(Number);
                    const openMin = openH * 60 + openM;
                    const closeMin = closeH * 60 + closeM;

                    if (currentMinutes >= openMin && currentMinutes < closeMin) {
                        isOpenNow = true;
                        break;
                    }
                }
            }
        }

        // --- Calculate Next Open / Closes At ---
        let closesAt = null;
        let nextOpen = null;
        let nextOpenDetails = null;
        let todayTimes = '';
        let currentSlot = null; // New: Specific slot that is currently active

        // Helper to format time
        const formatTime = (timeStr) => timeStr; // Already HH:MM

        // 1. If Open: Find when it closes
        if (isOpenNow) {
            const todayData = weekData[days[currentDayIndex]];
            if (todayData && !todayData.closed) {
                // Find the current slot
                for (const slot of todayData.timeSlots) {
                    const [openH, openM] = slot.open.split(':').map(Number);
                    const [closeH, closeM] = slot.close.split(':').map(Number);
                    const openMin = openH * 60 + openM;
                    const closeMin = closeH * 60 + closeM;

                    if (currentMinutes >= openMin && currentMinutes < closeMin) {
                        closesAt = slot.close;
                        currentSlot = { open: slot.open, close: slot.close }; // Capture slot
                        break;
                    }
                }
                // Format today's times for Medium
                todayTimes = todayData.timeSlots.map(s => `${s.open} - ${s.close}`).join(' | ');
            }
        } else {
            // 2. If Closed: Find next opening

            // Check rest of today
            const todayData = weekData[days[currentDayIndex]];
            if (todayData && !todayData.closed) {
                for (const slot of todayData.timeSlots) {
                    const [openH, openM] = slot.open.split(':').map(Number);
                    const openMin = openH * 60 + openM;

                    if (openMin > currentMinutes) {
                        const dateParts = todayData.date.split('-');
                        nextOpen = `Heute ${slot.open}`;
                        nextOpenDetails = {
                            day: 'Heute',
                            date: `${dateParts[2]}.${dateParts[1]}.`,
                            time: slot.open
                        };
                        break;
                    }
                }
            }

            // Check subsequent days
            if (!nextOpen) {
                // 1. Check remaining days of THIS week
                for (let i = currentDayIndex + 1; i < 7; i++) {
                    const nextDayName = days[i];
                    const nextDayData = weekData[nextDayName];

                    if (nextDayData && !nextDayData.closed && nextDayData.timeSlots.length > 0) {
                        let dayLabel = i === 0 ? 'Montag' :
                            i === 1 ? 'Dienstag' :
                                i === 2 ? 'Mittwoch' :
                                    i === 3 ? 'Donnerstag' :
                                        i === 4 ? 'Freitag' :
                                            i === 5 ? 'Samstag' : 'Sonntag';

                        if (i === currentDayIndex + 1) dayLabel = 'Morgen';

                        nextOpen = `${dayLabel} ${nextDayData.timeSlots[0].open}`;
                        const dateParts = nextDayData.date.split('-');
                        nextOpenDetails = {
                            day: dayLabel,
                            date: `${dateParts[2]}.${dateParts[1]}.`,
                            time: nextDayData.timeSlots[0].open
                        };
                        break;
                    }
                }

                // 2. Check NEXT week if not found
                if (!nextOpen) {
                    // Calculate next week's Monday
                    const nextWeekMonday = new Date(currentMonday);
                    nextWeekMonday.setUTCDate(nextWeekMonday.getUTCDate() + 7);

                    // Determine Year and WeekNumber for next week
                    const d = new Date(Date.UTC(nextWeekMonday.getFullYear(), nextWeekMonday.getMonth(), nextWeekMonday.getDate()));
                    const dayNum = d.getUTCDay() || 7;
                    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
                    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
                    const nextWeekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
                    const nextYear = d.getUTCFullYear();

                    // Fetch next week doc
                    let nextWeekDoc = await Week.findOne({ customerId, year: nextYear, weekNumber: nextWeekNo });
                    if (!nextWeekDoc) {
                        nextWeekDoc = await Week.findOne({ customerId, year: 0, weekNumber: 0 });
                    }

                    let nextWeekdays = [];
                    if (nextWeekDoc) {
                        nextWeekdays = await Weekday.find({ weekId: nextWeekDoc._id });
                    }

                    // Iterate days of next week
                    for (let i = 0; i < 7; i++) {
                        const nextDate = new Date(nextWeekMonday);
                        nextDate.setUTCDate(nextDate.getUTCDate() + i);
                        const nextDateStr = nextDate.toISOString().split('T')[0];

                        // Check Special Day
                        const sd = specialDays.find(s => {
                            const sdFrom = s.dateFrom.toISOString().split('T')[0];
                            const sdTo = s.dateTo.toISOString().split('T')[0];
                            return nextDateStr >= sdFrom && nextDateStr <= sdTo;
                        });

                        let isClosed = false;
                        if (sd && !sd.isOpen) isClosed = true;

                        let slots = [];
                        if (!isClosed) {
                            const daySlots = nextWeekdays.filter(w => w.dayIndex === i);
                            if (daySlots.length > 0 && daySlots[0].isClosed) {
                                isClosed = true;
                            } else {
                                slots = daySlots.map(slot => ({
                                    open: slot.openTime,
                                    close: slot.closeTime
                                })).filter(s => s.open && s.close);
                            }
                        }

                        if (!isClosed && slots.length > 0) {
                            let dayLabel = i === 0 ? 'Montag' :
                                i === 1 ? 'Dienstag' :
                                    i === 2 ? 'Mittwoch' :
                                        i === 3 ? 'Donnerstag' :
                                            i === 4 ? 'Freitag' :
                                                i === 5 ? 'Samstag' : 'Sonntag';

                            if (currentDayIndex === 6 && i === 0) dayLabel = 'Morgen';

                            nextOpen = `${dayLabel} ${slots[0].open}`;
                            const dateParts = nextDateStr.split('-');
                            nextOpenDetails = {
                                day: dayLabel,
                                date: `${dateParts[2]}.${dateParts[1]}.`,
                                time: slots[0].open
                            };
                            break;
                        }
                    }
                }
            }
        }

        // Check for reason on the current day
        const currentData = weekData[days[currentDayIndex]];
        const currentReason = currentData ? currentData.reason : null;

        res.json({
            status: isOpenNow ? 'open' : 'closed',
            weekData: weekData,
            currentDate: now.toISOString().split('T')[0],
            closesAt: closesAt,
            nextOpen: nextOpen,
            nextOpenDetails: nextOpenDetails,
            currentSlot: currentSlot, // Pass specific slot info
            todayTimes: todayTimes,
            reason: currentReason
        });

    } catch (error) {
        console.error('Error in getPublicCurrentWeek:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    renderWochenplan,
    getWeek,
    saveWeek,
    getDecoupledWeeks,
    saveStandardWeek,
    getSpecialDays,
    saveSpecialDays,
    getPublicCurrentWeek
};
