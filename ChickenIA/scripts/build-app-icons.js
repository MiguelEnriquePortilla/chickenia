'use strict';
// Derive launch assets from the same approved mascot used by the in-app splash.
const sharp=require('sharp'),path=require('node:path');
const icons=path.resolve(__dirname,'../icons'),source=path.join(icons,'welcome-mascot.webp');
async function icon(size,ratio=.8){
 const mascot=await sharp(source).resize({height:Math.round(size*ratio)}).png().toBuffer();
 return sharp({create:{width:size,height:size,channels:4,background:'#17213e'}}).composite([{input:mascot,gravity:'centre'}]).png().toBuffer();
}
(async()=>{
 for(const size of [32,180,192,512]){
  const png=await icon(size);await sharp(png).toFile(path.join(icons,`chicania-launch-${size}.png`));
  // Keep older saved URLs compatible without retaining the retired portrait.
  if(size===32)await sharp(png).toFile(path.join(icons,'icon-32.png'));
  else await sharp(png).flatten({background:'#17213e'}).jpeg({quality:94}).toFile(path.join(icons,`icon-${size}.jpg`));
 }
 await sharp(await icon(512,.66)).toFile(path.join(icons,'chicania-launch-maskable-512.png'));
 console.log('Approved mascot launch assets generated.');
})().catch(e=>{console.error(e);process.exitCode=1;});
