// utils/sms.js — Nalo Solutions (GET or POST-JSON with key)
const axios = require('axios');

function normalizeMsisdn(to) {
  const arr = Array.isArray(to) ? to : [to];
  return arr.map(v => String(v).trim())
            .map(s => s.replace(/[^\d]/g, ''))        // drop +, spaces, dashes
            .map(s => s.startsWith('0') ? ('233' + s.slice(1)) : s) // 0xxxx -> 233xxxx
            .map(s => s.startsWith('233') ? s : s)     // assume already has country code
            .join(',');                                 // Nalo accepts CSV
}

function parseNaloResponse(data) {
  if (typeof data === 'string') {
    // e.g. "1701|233501371674|api.0000..."
    if (data.startsWith('1701')) return { ok: true, id: data.split('|')[2], raw: data };
    throw new Error(`Nalo error: ${data}`);
  }
  if (data && (data.status === '1701' || data.status === 1701)) {
    return { ok: true, id: data.job_id, raw: data };
  }
  throw new Error(`Nalo error: ${JSON.stringify(data)}`);
}

async function sendSmsNalo(to, text, { sender } = {}) {
  const baseUrl = process.env.NALO_BASE_URL || 'https://sms.nalosolutions.com/smsbackend/Resl_Nalo/send-message/';
  const mode = (process.env.NALO_MODE || 'POST_KEY').toUpperCase();  // POST_KEY | GET_KEY
  const key  = process.env.NALO_KEY;
  const from = sender || process.env.NALO_SENDER || 'IMPERIAL';
  if (!key) throw new Error('NALO_KEY missing');

  const msisdn = normalizeMsisdn(to);

  if (mode === 'GET_KEY') {
    const params = new URLSearchParams({
      key, type: '0', destination: msisdn, dlr: '1', source: from, message: text
    });
    const url = baseUrl + (baseUrl.includes('?') ? '' : '?') + params.toString();
    const res = await axios.get(url);
    return parseNaloResponse(res.data);
  }

  // default: POST JSON with key
  const res = await axios.post(baseUrl, {
    key, msisdn, message: text, sender_id: from
  }, { headers: { 'Content-Type': 'application/json' } });
  return parseNaloResponse(res.data);
}

async function sendSms(to, body, opts) { return sendSmsNalo(to, body, opts); }
module.exports = { sendSms };
