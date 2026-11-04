const STORAGE_KEY = 'sticker-h5-v01-orders';
export function loadOrders() {
  try { const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); return Array.isArray(data)?data:[]; } catch { return []; }
}
export function saveOrders(orders) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(orders)); return true; }
  catch { return false; }
}
export async function downscaleImage(file,maxEdge=960,quality=.73) {
  if (!file?.type?.startsWith('image/')) throw new Error('请上传 JPG、PNG 或 WebP 图片。');
  if (file.size>12*1024*1024) throw new Error('图片超过 12 MB，请先压缩。');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const ratio = Math.min(1,maxEdge/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));
    canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
    const ctx=canvas.getContext('2d');
    if (!ctx) throw new Error('当前浏览器无法处理图片。');
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    let data=canvas.toDataURL('image/webp',quality);
    if(!data.startsWith('data:image/webp')) data=canvas.toDataURL('image/jpeg',quality);
    if(data.length>1500000) throw new Error('处理后的图片仍过大，请选择较小的文件。');
    return data;
  } finally { URL.revokeObjectURL(url); }
}
export function downloadBlob(blob,name) {
  const link=document.createElement('a'); const url=URL.createObjectURL(blob);
  link.href=url;link.download=name; document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),15000);
}
export function downloadOrderJson(order) {
  const payload={exportedAt:new Date().toISOString(),about:'朋友测试版订单包。本文件可能包含参考图片，发送前请确认收件人。',order};
  downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}),`${order.id}-测试订单.json`);
}
export async function copyText(text) {
  if(navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return; }
  const ta=document.createElement('textarea'); ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.append(ta);ta.select();
  try { if(!document.execCommand('copy')) throw new Error('复制失败'); }
  finally { ta.remove(); }
}
function openDB() {
  return new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)) return reject(new Error('此浏览器不支持本地文件保存'));
    const req=indexedDB.open('sticker-h5-v01-files',1);
    req.onupgradeneeded=()=>{ if(!req.result.objectStoreNames.contains('attachments')) req.result.createObjectStore('attachments'); };
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error || new Error('数据库打开失败'));
  });
}
export async function saveAttachment(key,blob) {
  const db=await openDB();
  try { await new Promise((resolve,reject)=>{const tx=db.transaction('attachments','readwrite');tx.objectStore('attachments').put(blob,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);}); }
  finally {db.close();}
}
export async function readAttachment(key) {
  const db=await openDB();
  try {return await new Promise((resolve,reject)=>{const req=db.transaction('attachments','readonly').objectStore('attachments').get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
  finally {db.close();}
}
