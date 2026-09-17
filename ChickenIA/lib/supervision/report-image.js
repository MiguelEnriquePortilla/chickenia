'use strict';
const sharp = require('sharp');
const path = require('node:path');
const { CUTS, ZONE } = require('./telegram');
const fontfile = path.join(__dirname, 'NotoSans.ttf');
const escape = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));

async function renderReport(snapshot) {
  const width = 960, overlays = [], graphics = [];
  let y = 44;
  async function text(value, left, top, size, color, maxWidth, bold = false) {
    const input = await sharp({text:{text:`<span foreground="${color}">${escape(value)}</span>`,font:`Noto Sans ${bold?'Bold ':''}${size}`,fontfile,width:maxWidth,rgba:true,wrap:'word-char'}}).png().toBuffer();
    const {height} = await sharp(input).metadata();
    overlays.push({input,left,top});
    return height;
  }
  y += await text('CHICKENIA / SUPERVISIÓN',44,y,32,'#ffffff',872,true) + 18;
  y += await text(`${snapshot.location} · ${snapshot.date}`,44,y,24,'#c6c9d0',872) + 12;
  const time = new Date(snapshot.captured_at).toLocaleTimeString('es-MX',{timeZone:ZONE,hour12:false});
  y += await text(`${CUTS.find(c=>c.id===snapshot.cut).label} · ${time} CDMX`,44,y,22,'#c6c9d0',872) + 36;
  y += await text('AVANCE DEL DÍA',44,y,22,'#c6c9d0',872) + 12;
  y += await text(snapshot.overall_score == null ? 'Sin datos' : `${snapshot.overall_score}%`,44,y,66,'#ff8094',872,true) + 12;
  y += await text('Según verificaciones registradas al momento del corte',44,y,20,'#c6c9d0',872) + 34;
  for (const area of snapshot.areas) {
    graphics.push(`<path d="M44 ${y}H916" stroke="#3a3d44"/>`);
    y += 22;
    const color = {complete:'#64d7a0',critical:'#ff8094',pending:'#f4c86d',later:'#aeb8ce'}[area.status] || '#c6c9d0';
    graphics.push(`<circle cx="54" cy="${y+17}" r="7" fill="${color}"/>`);
    const titleHeight = await text(area.name,76,y,29,'#ffffff',650,true);
    await text(area.day == null ? '—' : `${area.day}%`,790,y,29,color,126,true);
    y += titleHeight + 12;
    y += await text(`${area.summary} · ${area.done}/${area.total} verificadas`,76,y,22,color,840) + 10;
    if (area.next_task) y += await text(`Revisar: ${area.next_task}`,76,y,21,'#c6c9d0',840) + 10;
    y += 16;
  }
  y += 18;
  y += await text('SIGUIENTE PASO',44,y,22,'#ff8094',872,true) + 14;
  y += await text(snapshot.instruction,44,y,24,'#ffffff',872) + 30;
  y += await text('La imagen conserva este corte. El dashboard puede mostrar avances posteriores.',44,y,20,'#c6c9d0',872) + 44;
  const background = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${y}"><rect width="100%" height="100%" fill="#202226"/>${graphics.join('')}</svg>`);
  return sharp(background).composite(overlays).png().toBuffer();
}
module.exports = { renderReport };
