'use strict';
// Raster fallbacks for platforms that require PNG or keep legacy launch URLs.
const sharp=require('sharp'),path=require('node:path');
const icons=path.resolve(__dirname,'../icons'),source=path.join(icons,'chicania-app.svg');
async function icon(size){
 return sharp(source).resize(size,size).png().toBuffer();
}
const nativeBackground='#17213e';
(async()=>{
 for(const size of [32,180,192,512]){
  const png=await icon(size);
  const launch=sharp(png);
  if(size===180)launch.flatten({background:nativeBackground});
  await launch.toFile(path.join(icons,`chicania-launch-${size}.png`));
  // Keep older saved URLs compatible without retaining the retired portrait.
  if(size===32)await sharp(png).toFile(path.join(icons,'icon-32.png'));
  else await sharp(png).flatten({background:nativeBackground}).jpeg({quality:94}).toFile(path.join(icons,`icon-${size}.jpg`));
 }
 await sharp(await icon(512)).flatten({background:nativeBackground}).toFile(path.join(icons,'chicania-launch-maskable-512.png'));
 console.log('Chicken ChicanIA launch assets generated.');
})().catch(e=>{console.error(e);process.exitCode=1;});
