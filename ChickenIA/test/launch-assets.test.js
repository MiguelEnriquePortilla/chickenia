'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..');
test('installed launch assets use approved PNGs, real sizes and a coherent native background',async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
 assert.equal(manifest.start_url,'/');assert.equal(manifest.background_color.toLowerCase(),'#17213e');
 assert.deepEqual(manifest.icons.map(i=>i.purpose),['any','any','any','maskable']);
 const [svg,...pngs]=manifest.icons;
 assert.equal(svg.sizes,'any');assert.equal(svg.type,'image/svg+xml');
 assert.equal((await sharp(path.join(root,svg.src)).metadata()).format,'svg');
 for(const i of pngs){
  const file=path.join(root,i.src), metadata=await sharp(file).metadata();
  assert.equal(i.sizes,`${metadata.width}x${metadata.height}`);
  assert.equal(metadata.format,'png');
  const corner=await sharp(file).extract({left:0,top:0,width:1,height:1}).ensureAlpha().raw().toBuffer();
  if(i.purpose==='maskable')assert.deepEqual([...corner],[23,33,62,255]);
  else assert.equal(corner[3],0);
 }
 const appleCorner=await sharp(path.join(root,'icons/chicania-launch-180.png')).extract({left:0,top:0,width:1,height:1}).ensureAlpha().raw().toBuffer();
 assert.deepEqual([...appleCorner],[23,33,62,255]);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert(html.includes('chicania-launch-180.png'));assert(html.includes('welcome-pending'));assert(html.indexOf("classList.add('welcome-pending')")<html.indexOf('<body'));
});
