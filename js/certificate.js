/* ============================================================
   AI-kørekort: certifikat-generering (HTML5 canvas)
   ============================================================ */

(function (global) {
  const W = 1600;
  const H = 1131; // ~A4 landscape ratio

  const MONTHS_DA = [
    "januar", "februar", "marts", "april", "maj", "juni",
    "juli", "august", "september", "oktober", "november", "december",
  ];

  function todayDanish() {
    const d = new Date();
    return d.getDate() + ". " + MONTHS_DA[d.getMonth()] + " " + d.getFullYear();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw(canvas, { navn, logoImg, aabenraaLogoImg, aabenraaFullLogoImg }) {
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Background
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#ffffff");
    bg.addColorStop(1, "#eaf1f8");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Outer decorative border
    ctx.strokeStyle = "#096fb7";
    ctx.lineWidth = 10;
    roundRect(ctx, 34, 34, W - 68, H - 68, 22);
    ctx.stroke();

    ctx.strokeStyle = "#f3cb13";
    ctx.lineWidth = 3;
    roundRect(ctx, 54, 54, W - 108, H - 108, 16);
    ctx.stroke();

    // Corner accents
    ctx.fillStyle = "#dc911a";
    [[54, 54], [W - 54, 54], [54, H - 54], [W - 54, H - 54]].forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
    });

    // Corner logos: PUC top-left, Aabenraa Kommune (full logo incl. tekst) top-right.
    // Matched by height so both read as equally prominent; width follows each logo's own aspect ratio.
    const cornerLogoH = 130;
    const cornerY = 92;
    const cornerPad = 90;

    if (logoImg) {
      const w = cornerLogoH * ((logoImg.naturalWidth || 800) / (logoImg.naturalHeight || 632));
      ctx.drawImage(logoImg, cornerPad, cornerY, w, cornerLogoH);
    }

    if (aabenraaFullLogoImg) {
      const w = cornerLogoH * ((aabenraaFullLogoImg.naturalWidth || 1600) / (aabenraaFullLogoImg.naturalHeight || 530));
      ctx.drawImage(aabenraaFullLogoImg, W - cornerPad - w, cornerY, w, cornerLogoH);
    }

    let y = cornerY + cornerLogoH + 50;

    // Kicker
    ctx.textAlign = "center";
    ctx.fillStyle = "#dc911a";
    ctx.font = "700 24px Inter, Arial, sans-serif";
    ctx.fillText("PUC AABENRAA · AABENRAA KOMMUNE", W / 2, y);

    // Title
    y += 62;
    ctx.fillStyle = "#06426f";
    ctx.font = "800 72px Inter, Arial, sans-serif";
    ctx.fillText("AI-KØREKORT", W / 2, y);

    // Subtitle
    y += 40;
    ctx.fillStyle = "#445064";
    ctx.font = "500 26px Inter, Arial, sans-serif";
    ctx.fillText("Bevis for gennemført AI-kørekort for undervisere", W / 2, y);

    // "Dette er at certificere at"
    y += 70;
    ctx.fillStyle = "#1c2733";
    ctx.font = "italic 400 24px Inter, Arial, sans-serif";
    ctx.fillText("Det attesteres herved, at", W / 2, y);

    // Name
    y += 78;
    ctx.fillStyle = "#096fb7";
    ctx.font = "800 58px Inter, Arial, sans-serif";
    let displayName = navn && navn.trim() ? navn.trim() : "___________________________";
    ctx.fillText(displayName, W / 2, y);

    // underline for name
    ctx.strokeStyle = "#f3cb13";
    ctx.lineWidth = 4;
    const nameWidth = Math.min(ctx.measureText(displayName).width + 60, W - 300);
    ctx.beginPath();
    ctx.moveTo(W / 2 - nameWidth / 2, y + 18);
    ctx.lineTo(W / 2 + nameWidth / 2, y + 18);
    ctx.stroke();

    // Completion statement
    y += 70;
    ctx.fillStyle = "#1c2733";
    ctx.font = "500 28px Inter, Arial, sans-serif";
    ctx.fillText("har gennemført alle 7 kapitler af AI-kørekortet", W / 2, y);

    // Body text
    y += 56;
    ctx.fillStyle = "#445064";
    ctx.font = "400 21px Inter, Arial, sans-serif";
    ctx.fillText(
      "og har opnået et praksisnært fundament for ansvarlig og didaktisk brug af kunstig intelligens i undervisningen.",
      W / 2, y
    );

    // Chapter chips
    y += 54;
    const chapters = [
      "Teoretisk grundlag", "Prompt engineering", "AI modeller", "AI i praksis",
      "Undervisning med AI", "Anbefalinger", "Inspiration",
    ];
    ctx.font = "700 15px Inter, Arial, sans-serif";
    const chipPad = 16;
    const chipH = 34;
    const gap = 10;
    const widths = chapters.map((c) => ctx.measureText(c).width + chipPad * 2);
    const totalW = widths.reduce((a, b) => a + b, 0) + gap * (chapters.length - 1);
    let cx = W / 2 - totalW / 2;
    chapters.forEach((c, i) => {
      const cw = widths[i];
      ctx.fillStyle = "#eaf3fc";
      roundRect(ctx, cx, y - chipH / 2, cw, chipH, chipH / 2);
      ctx.fill();
      ctx.strokeStyle = "#cfe1f4";
      ctx.lineWidth = 1.5;
      roundRect(ctx, cx, y - chipH / 2, cw, chipH, chipH / 2);
      ctx.stroke();
      ctx.fillStyle = "#06426f";
      ctx.fillText(c, cx + cw / 2, y + 6);
      cx += cw + gap;
    });

    // Footer: right column (issue date, signature line, issuer text).
    // Only the top corner logos are shown — no logos in the footer.
    const footerY = H - 150;
    const rightX = W - 130;

    ctx.textAlign = "right";
    ctx.fillStyle = "#445064";
    ctx.font = "600 15px Inter, Arial, sans-serif";
    ctx.fillText("Udstedt: " + todayDanish(), rightX, footerY - 50);

    // signature rule
    ctx.strokeStyle = "#d9e3ec";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W - 420, footerY - 40);
    ctx.lineTo(rightX, footerY - 40);
    ctx.stroke();

    ctx.textAlign = "right";
    ctx.font = "700 22px Inter, Arial, sans-serif";
    ctx.fillStyle = "#06426f";
    ctx.fillText("PUC Aabenraa", rightX, footerY - 8);
    ctx.font = "500 17px Inter, Arial, sans-serif";
    ctx.fillStyle = "#445064";
    ctx.fillText("Pædagogisk UdviklingsCenter · Aabenraa Kommune", rightX, footerY + 16);
  }

  function loadLogo(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function downloadPNG(canvas, filename) {
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  global.AICertificate = { draw, loadLogo, downloadPNG };
})(window);
