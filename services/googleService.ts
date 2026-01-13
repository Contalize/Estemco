// src/services/googleService.ts

export interface ProjectData {
    client: string;
    address: string;
    type: string;
    meters: number;
    startDate: string; // ISO DateTime
    endDate: string; // ISO DateTime
}

/**
 * Creates a generic event in the user's primary Google Calendar.
 */
export const createCalendarEvent = async (event: any, token: string, attendees: string[] = []) => {
    // Add attendees if provided
    if (attendees && attendees.length > 0) {
        event.attendees = attendees.map(email => ({ email }));
    }
    // Ensure colors based on tags if not provided
    if (!event.colorId) {
        if (JSON.stringify(event).includes('[EQP]')) event.colorId = '10'; // Green
        if (JSON.stringify(event).includes('[TASK]')) event.colorId = '11'; // Red
    }

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const errorMessage = errorBody.error?.message || response.statusText || 'Unknown Error';
        throw new Error(`Calendar API Error (${response.status}): ${errorMessage}`);
    }
    return await response.json();
};

/**
 * Creates an event in the user's primary Google Calendar (Legacy/Specific).
 */
export const syncProjectToCalendar = async (projectData: ProjectData, token: string) => {
    const event = {
        'summary': `[OBRA] ${projectData.client}`,
        'location': projectData.address,
        'description': `[EQP:${projectData.type}] Execução. Metragem: ${projectData.meters}m`,
        'start': { 'dateTime': projectData.startDate, 'timeZone': 'America/Sao_Paulo' },
        'end': { 'dateTime': projectData.endDate, 'timeZone': 'America/Sao_Paulo' },
        'colorId': '10' // Green for Works
    };
    return createCalendarEvent(event, token);
};

/**
 * Lists upcoming events from the user's primary Google Calendar.
 */
export const listCalendarEvents = async (token: string) => {
    const timeMin = new Date().toISOString();
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&maxResults=20&singleEvents=true&orderBy=startTime`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized');
        throw new Error(`Calendar List Error: ${response.statusText}`);
    }
    return await response.json();
};

/**
 * Creates a folder structure in Google Drive and can upload files.
 * Structure: Estemco_Obras / Client Name
 */
export const createProjectFolder = async (clientName: string, token: string) => {
    // 1. Check/Create Root Folder "Estemco_Obras"
    // This simplified version creates a folder in root. In prod, you'd search for existing folders first.

    // Metadata for the client folder
    const fileMetadata = {
        'name': clientName,
        'mimeType': 'application/vnd.google-apps.folder',
        // 'parents': ['root_folder_id'] // Optional: Put inside a specific parent
    };

    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(fileMetadata)
    });

    if (!response.ok) throw new Error(`Drive API Error: ${response.statusText}`);
    return await response.json(); // Returns folder ID
};

/**
 * Sends an email via Gmail API using raw format (Base64url encoded).
 */
export const sendNotificationEmail = async (to: string, subject: string, body: string, token: string) => {
    const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
    const messageParts = [
        `From: Estemco System <me>`,
        `To: ${to}`,
        `Subject: ${utf8Subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=utf-8`,
        `Content-Transfer-Encoding: 7bit`,
        ``,
        body
    ];
    const message = messageParts.join('\n');

    // Base64url encoding
    const encodedMessage = btoa(unescape(encodeURIComponent(message)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: encodedMessage })
    });

    if (!response.ok) throw new Error(`Gmail API Error: ${response.statusText}`);
    return await response.json();
};
