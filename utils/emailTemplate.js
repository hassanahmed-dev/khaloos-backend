// Shared branded layout for transactional emails (verification, password reset, order updates).
// Inline styles only — most email clients strip <style> blocks.

const BRAND = 'KHALOOS';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderEmail({ heading, intro, highlight, ctaLabel, ctaUrl, outro }) {
  const highlightBlock = highlight
    ? `<p style="margin:24px 0;padding:18px 24px;background:#f6f1ea;border-radius:8px;font-size:26px;letter-spacing:6px;text-align:center;color:#1f1b18;font-weight:600;">${escapeHtml(highlight)}</p>`
    : '';
  const ctaBlock = ctaLabel && ctaUrl
    ? `<p style="margin:28px 0;text-align:center;"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:14px 28px;background:#1f1b18;color:#fbf8f3;text-decoration:none;border-radius:999px;font-size:14px;letter-spacing:1px;text-transform:uppercase;">${escapeHtml(ctaLabel)}</a></p>
       <p style="margin:0 0 8px;font-size:12px;color:#8a8178;word-break:break-all;">If the button doesn't work, copy this link into your browser:<br>${escapeHtml(ctaUrl)}</p>`
    : '';

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#fbf8f3;font-family:Helvetica,Arial,sans-serif;color:#3a332d;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbf8f3;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #ece4d9;border-radius:12px;">
        <tr><td style="padding:28px 32px 8px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:24px;letter-spacing:8px;color:#1f1b18;">${BRAND}</td></tr>
        <tr><td style="padding:8px 32px 32px;font-size:15px;line-height:1.6;">
          <h1 style="margin:16px 0 12px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:24px;color:#1f1b18;">${escapeHtml(heading)}</h1>
          ${intro ? `<p style="margin:0 0 12px;">${escapeHtml(intro)}</p>` : ''}
          ${highlightBlock}
          ${ctaBlock}
          ${outro ? `<p style="margin:16px 0 0;color:#6b625a;">${escapeHtml(outro)}</p>` : ''}
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#8a8178;">${BRAND} &middot; Where style meets craft</p>
    </td></tr>
  </table>
</body></html>`;
}

module.exports = { renderEmail, escapeHtml };
