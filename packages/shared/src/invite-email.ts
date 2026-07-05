function inviteEmailButton(href: string, label: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px">
      <tr>
        <td align="center" bgcolor="#57cc99" style="border-radius:8px">
          <a href="${href}" target="_blank" rel="noopener noreferrer"
             style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:600;
                    color:#000000;text-decoration:none;border-radius:8px">
            ${label}
          </a>
        </td>
      </tr>
    </table>
  `;
}

export function buildMemberInviteEmailHtml({
  gymName,
  webInviteUrl,
  mobileInviteUrl,
}: {
  gymName: string;
  webInviteUrl: string;
  mobileInviteUrl: string;
}): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h1 style="font-size:20px;margin:0 0 8px">${gymName}</h1>
      <p style="color:#555;margin:0 0 24px">
        Votre salle vous invite à activer votre carte membre numérique.
        Créez votre mot de passe pour accéder à votre QR de check-in.
      </p>
      ${inviteEmailButton(webInviteUrl, "Activer ma carte")}
      <p style="color:#888;font-size:13px;margin:0 0 12px">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
        <a href="${webInviteUrl}" target="_blank" rel="noopener noreferrer">${webInviteUrl}</a>
      </p>
      <p style="color:#888;font-size:13px;margin:0">
        Depuis l'app mobile installée, vous pouvez aussi coller ce lien :
        <span style="word-break:break-all">${mobileInviteUrl}</span>
      </p>
      <p style="color:#888;font-size:13px;margin-top:24px">
        Ce lien expire dans 72 heures. Si vous n'avez pas demandé cette invitation, ignorez cet e-mail.
      </p>
    </div>
  `;
}
