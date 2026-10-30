import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { google } from 'googleapis';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

// Helper to construct OAuth2 Client
function getOAuth2Client(req: express.Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.OAUTH_CLIENT_ID || process.env.CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET || process.env.CLIENT_SECRET || '';
  const host = req.get('host');
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${protocol}://${host}/api/auth/callback`;

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// 1. Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. Auth status & Config check
app.get('/api/auth/status', (req, res) => {
  const token = req.cookies.gcal_access_token || req.headers.authorization?.replace('Bearer ', '');
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.OAUTH_CLIENT_ID || process.env.CLIENT_ID || '';
  
  res.json({
    configured: Boolean(clientId),
    authenticated: Boolean(token),
    hasRefreshToken: Boolean(req.cookies.gcal_refresh_token),
  });
});

// 3. Get Auth URL
app.get('/api/auth/google/url', (req, res) => {
  const oauth2Client = getOAuth2Client(req);
  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly'
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });

  res.json({ url });
});

// Direct redirect to auth
app.get('/api/auth/google', (req, res) => {
  const oauth2Client = getOAuth2Client(req);
  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly'
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });

  res.redirect(url);
});

// 4. OAuth Callback
app.get('/api/auth/callback', async (req, res) => {
  const code = req.query.code as string;
  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  try {
    const oauth2Client = getOAuth2Client(req);
    const { tokens } = await oauth2Client.getToken(code);

    if (tokens.access_token) {
      res.cookie('gcal_access_token', tokens.access_token, {
        httpOnly: false,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    if (tokens.refresh_token) {
      res.cookie('gcal_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    // Return HTML that posts message to opener or redirects back
    res.send(`
      <!語html>
      <html>
        <head>
          <title>Google Calendar Connected</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: white; text-align: center; margin: 0; }
            .card { background: #1e293b; padding: 32px; border-radius: 24px; border: 1px solid #334155; max-width: 400px; }
            .icon { font-size: 48px; color: #10b981; margin-bottom: 16px; }
            button { background: #e11d48; color: white; border: none; padding: 10px 20px; border-radius: 12px; font-weight: bold; cursor: pointer; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✓</div>
            <h2>Google Calendar Terhubung!</h2>
            <p>SINKRONISASI JADWAL UJIAN & TUGAS SIAP DIGUNAKAN.</p>
            <p style="font-size: 12px; color: #94a3b8;">Jendela ini akan tertutup secara otomatis...</p>
            <button onclick="window.close()">Tutup Jendela</button>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_CALENDAR_AUTH_SUCCESS', token: ${JSON.stringify(tokens.access_token)} }, '*');
              setTimeout(() => { window.close(); }, 1500);
            } else {
              setTimeout(() => { window.location.href = '/'; }, 2000);
            }
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('OAuth Callback Error:', error);
    res.status(500).send(`Authentication failed: ${error.message || error}`);
  }
});

// Logout / Disconnect
app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('gcal_access_token');
  res.clearCookie('gcal_refresh_token');
  res.json({ success: true });
});

// Helper to get authenticated Calendar instance
function getCalendarApi(req: express.Request) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.gcal_access_token;
  const refreshToken = req.cookies.gcal_refresh_token;

  if (!token && !refreshToken) {
    throw new Error('UNAUTHORIZED');
  }

  const oauth2Client = getOAuth2Client(req);
  oauth2Client.setCredentials({
    access_token: token,
    refresh_token: refreshToken,
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

// 5. Sync Event to Google Calendar
app.post('/api/calendar/sync-event', async (req, res) => {
  try {
    const calendar = getCalendarApi(req);
    const { title, description, startDate, endDate, location, isAllDay } = req.body;

    if (!title || !startDate) {
      return res.status(400).json({ error: 'Title and startDate are required' });
    }

    let start: any = {};
    let end: any = {};

    if (isAllDay) {
      start.date = startDate.split('T')[0];
      // Google Calendar all-day end date is exclusive, so if same day, add 1 day or use same date
      const endD = endDate ? endDate.split('T')[0] : start.date;
      end.date = endD;
    } else {
      start.dateTime = new Date(startDate).toISOString();
      const endD = endDate ? new Date(endDate) : new Date(new Date(startDate).getTime() + 60 * 60 * 1000);
      end.dateTime = endD.toISOString();
    }

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: title,
        description: description || 'Disinkronkan dari Aplikasi SD Negeri Harapan Bangsa',
        location: location || 'SD Negeri Harapan Bangsa',
        start,
        end,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 1440 }, // 1 day before
            { method: 'popup', minutes: 120 },  // 2 hours before
          ],
        },
      },
    });

    res.json({ success: true, eventId: event.data.id, htmlLink: event.data.htmlLink });
  } catch (error: any) {
    console.error('Error syncing calendar event:', error);
    if (error.message === 'UNAUTHORIZED' || error.code === 401) {
      return res.status(401).json({ error: 'Pengguna belum terhubung ke Google Calendar. Silakan login terlebih dahulu.' });
    }
    res.status(500).json({ error: error.message || 'Gagal mensinkronisasikan acara ke Google Calendar' });
  }
});

// 6. Batch Sync Multiple Schedules
app.post('/api/calendar/sync-batch', async (req, res) => {
  try {
    const calendar = getCalendarApi(req);
    const { events } = req.body; // Array of { title, description, startDate, endDate, location, isAllDay }

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'Array of events is required' });
    }

    const results = [];
    for (const evt of events) {
      let start: any = {};
      let end: any = {};

      if (evt.isAllDay) {
        start.date = evt.startDate.split('T')[0];
        end.date = evt.endDate ? evt.endDate.split('T')[0] : start.date;
      } else {
        start.dateTime = new Date(evt.startDate).toISOString();
        const endD = evt.endDate ? new Date(evt.endDate) : new Date(new Date(evt.startDate).getTime() + 60 * 60 * 1000);
        end.dateTime = endD.toISOString();
      }

      try {
        const created = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary: evt.title,
            description: evt.description || 'Disinkronkan dari Aplikasi SD Negeri Harapan Bangsa',
            location: evt.location || 'SD Negeri Harapan Bangsa',
            start,
            end,
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'popup', minutes: 1440 }, // 1 day before
                { method: 'popup', minutes: 120 },  // 2 hours before
              ],
            },
          },
        });
        results.push({ title: evt.title, success: true, id: created.data.id, link: created.data.htmlLink });
      } catch (err: any) {
        results.push({ title: evt.title, success: false, error: err.message });
      }
    }

    res.json({ success: true, syncedCount: results.filter(r => r.success).length, results });
  } catch (error: any) {
    console.error('Error batch syncing calendar events:', error);
    if (error.message === 'UNAUTHORIZED' || error.code === 401) {
      return res.status(401).json({ error: 'Pengguna belum terhubung ke Google Calendar. Silakan login terlebih dahulu.' });
    }
    res.status(500).json({ error: error.message || 'Gagal mensinkronisasikan jadwal ke Google Calendar' });
  }
});

// 7. Get upcoming events list
app.get('/api/calendar/events', async (req, res) => {
  try {
    const calendar = getCalendarApi(req);
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 20,
      singleEvents: true,
      orderBy: 'startTime',
    });

    res.json({ events: response.data.items });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.code === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.status(500).json({ error: error.message || 'Gagal mengambil data dari Google Calendar' });
  }
});

// Vite Middleware or Static Production Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
