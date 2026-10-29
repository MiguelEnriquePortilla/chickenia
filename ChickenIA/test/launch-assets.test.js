'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..');
test('installed launch assets use approved PNGs, real sizes and a coherent native background',async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
 assert.equal(manifest.start_url,'/');assert.equal(manifest.background_color.toLowerCase(),'#17213e');
 assert.deepEqual(manifest.icons.map(i=>i.purpose),['any','any','maskable']);
 for(const i of manifest.icons){assert(!i.src.includes('icon-512.jpg'));const file=path.join(root,i.src);const m=await sharp(file).metadata();assert.equal(i.sizes,`${m.width}x${m.height}`);assert.equal(m.format,'png');const p=await sharp(file).extract({left:0,top:0,width:1,height:1}).removeAlpha().raw().toBuffer();assert.deepEqual([...p],[23,33,62]);}
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert(html.includes('chicania-launch-180.png'));assert(html.includes('welcome-pending'));assert(html.indexOf("classList.add('welcome-pending')")<html.indexOf('<body'));
});
