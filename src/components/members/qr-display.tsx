"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/components/i18n/locale-provider";
import { generateMemberQrPayload } from "@/lib/member-qr";

export function QrDisplay({
  memberId,
  memberName,
  gymName,
  validUntil,
}: {
  memberId: string;
  memberName: string;
  gymName: string;
  validUntil: string;
}) {
  const t = useT();
  const [dataUrl, setDataUrl] = useState<string>("");

  const payload = useMemo(() => generateMemberQrPayload(memberId), [memberId]);

  useEffect(() => {
    QRCode.toDataURL(payload, {
      width: 320,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setDataUrl);
  }, [payload]);

  function handlePrint() {
    if (!dataUrl) return;
    const win = window.open("", "_blank", "width=420,height=620");
    if (!win) return;
    win.document.write(`
      <html><head><title>${memberName}</title>
      <style>
        body{font-family:system-ui,sans-serif;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#000}
        .card{width:320px;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.5);background:#0a0a0a;border:1px solid rgba(255,255,255,.12)}
        .head{background:#000;color:#fff;padding:20px 24px;border-bottom:1px solid rgba(255,255,255,.12)}
        .head small{opacity:.7;font-size:12px;letter-spacing:.08em;text-transform:uppercase}
        .head h2{margin:4px 0 0;font-size:20px}
        .body{padding:24px;text-align:center}
        .body img{width:240px;height:240px}
        .body p{margin:14px 0 0;color:rgba(255,255,255,.6);font-size:13px}
        .name{font-size:18px;font-weight:700;color:#fff;margin-top:8px}
      </style></head>
      <body><div class="card">
        <div class="head"><small>${gymName}</small><h2>${t("detail.qrTitle")}</h2></div>
        <div class="body">
          <img src="${dataUrl}" alt="QR"/>
          <div class="name">${memberName}</div>
          <p>${t("detail.cardValid")} ${validUntil}</p>
        </div>
      </div>
      <script>window.onload=function(){setTimeout(function(){window.print()},250)}</script>
      </body></html>`);
    win.document.close();
  }

  return (
    <Card className="overflow-hidden p-0">
      <CardHeader className="rounded-none border-b border-border bg-card px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {gymName}
        </p>
        <CardTitle className="text-lg">{t("detail.qrTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3 pt-5">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt={`QR ${memberName}`}
            className="size-52 rounded-xl border border-border"
          />
        ) : (
          <div className="size-52 animate-pulse rounded-xl bg-muted" />
        )}
        <div className="text-center">
          <p className="font-bold text-foreground">{memberName}</p>
          <p className="text-xs text-muted-foreground">
            {t("detail.cardValid")} {validUntil}
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2">
          <Button variant="secondary" asChild>
            <a href={dataUrl || undefined} download={`qr-${memberId}.png`}>
              <Download className="size-4" />
              {t("detail.downloadQr")}
            </a>
          </Button>
          <Button variant="secondary" onClick={handlePrint}>
            <Printer className="size-4" />
            {t("detail.printCard")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
