import { EXPRESSIONS, STATUS, PLATFORM, TEMPLATES } from './data.js';
export function safeText(value) {
  return String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function shortDate(raw) {
  try { return new Date(raw).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}); } catch { return '—'; }
}
export function templateName(id) { return TEMPLATES.find(t=>t.id===id)?.name || '自定义模板'; }
export function platformName(id) { return PLATFORM[id] || '微信'; }
export function stateLabel(id) { return STATUS[id] || id; }
export function buildSummary(source) {
  const expr = Array.isArray(source.expressions) ? source.expressions : EXPRESSIONS.slice(0,16);
  const discussions = (source.chat || []).filter(m=>m.role==='user').map(m=>m.text).filter(Boolean);
  return [
    `风格：${templateName(source.templateId)}`,
    `平台：${platformName(source.platform)}；数量：${source.count} 张静态表情`,
    `角色称呼：${source.nickname?.trim() || '暂未填写'}`,
    `客户补充要求：${source.notes?.trim() || '无'}`,
    `客户聊天补充：${discussions.length ? discussions.join('；') : '无'}`,
    `表情清单：${expr.map((v,i)=>`${String(i+1).padStart(2,'0')}.${v}`).join('、')}`,
    '制作说明：请保持参考图中的角色身份和主要特征；初稿交付后最多 3 轮范围内修改。'
  ].join('\n');
}
export function createOrder(source) {
  const id = `ST${new Date().toISOString().slice(0,10).replaceAll('-','')}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
  return {
    id, schemaVersion:1, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(),
    status:'new', nickname:String(source.nickname||'').slice(0,50),
    templateId:source.templateId || 'chibi', platform:source.platform || 'wechat',
    count:Number(source.count) || 16, kind:'static', notes:String(source.notes||'').slice(0,1500),
    expressions:(source.expressions||EXPRESSIONS.slice(0,16)).map(s=>String(s).slice(0,40)),
    referenceName:String(source.referenceName||'').slice(0,150),
    referenceData:source.referenceData || '',
    chat:(source.chat||[]).slice(-30).map(m=>({role:m.role==='user'?'user':'bot',text:String(m.text||'').slice(0,600)})),
    summary:buildSummary(source),
    roundsUsed:0, revisions:[], previewImages:[], deliveries:[], deliveryKey:'',
    deliveryFileName:'', deliveryCount:0, demoPaid:false
  };
}
export function validOrderPayload(data) {
  const raw = data?.order || data;
  if (!raw || typeof raw !== 'object' || typeof raw.id!=='string' || !/^ST\d{8}-[A-Z0-9]{6}$/.test(raw.id)) throw new Error('订单编号不正确');
  if (![8,16,24].includes(Number(raw.count))) throw new Error('表情数量不正确');
  if (!['wechat','line','both'].includes(raw.platform)) throw new Error('平台参数不正确');
  if (!Array.isArray(raw.expressions) || raw.expressions.length!==Number(raw.count)) throw new Error('表情清单不完整');
  if (raw.referenceData && (typeof raw.referenceData!=='string' || !/^data:image\/(png|jpe?g|webp);base64,/i.test(raw.referenceData) || raw.referenceData.length>1500000)) throw new Error('参考图数据无效或过大');
  return {
    id:raw.id, schemaVersion:1, createdAt:String(raw.createdAt||new Date().toISOString()), updatedAt:new Date().toISOString(),
    status:['new','making','review','revision','done'].includes(raw.status)?raw.status:'new',
    nickname:String(raw.nickname||'').slice(0,50), templateId:TEMPLATES.some(t=>t.id===raw.templateId)?raw.templateId:'chibi',
    platform:raw.platform,count:Number(raw.count),kind:'static',notes:String(raw.notes||'').slice(0,1500),
    expressions:raw.expressions.map(s=>String(s).slice(0,40)),referenceName:String(raw.referenceName||'').slice(0,150),
    referenceData:raw.referenceData||'', chat:Array.isArray(raw.chat)?raw.chat.slice(-30).map(m=>({role:m.role==='user'?'user':'bot',text:String(m.text||'').slice(0,600)})):[],
    summary:String(raw.summary||'').slice(0,6000),
    roundsUsed:Math.max(0,Math.min(3,Number(raw.roundsUsed)||0)),
    revisions:Array.isArray(raw.revisions)?raw.revisions.slice(0,30).map(r=>({id:String(r.id||'').slice(0,70),text:String(r.text||'').slice(0,1500),createdAt:String(r.createdAt||''),status:['pending','accepted','correction','finished'].includes(r.status)?r.status:'pending',round:r.round===null?null:Number(r.round)||null})):[],
    previewImages:Array.isArray(raw.previewImages)?raw.previewImages.slice(0,24).filter(i=>typeof i?.data==='string'&&/^data:image\//.test(i.data)&&i.data.length<220000).map(i=>({name:String(i.name||'').slice(0,90),data:i.data})):[],
    deliveries:[],deliveryKey:'',deliveryFileName:'', deliveryCount:Number(raw.deliveryCount)||0, demoPaid:!!raw.demoPaid
  };
}
export function replyFromRules(message) {
  const s = message.trim();
  if (/多久|时间|几天|交付/.test(s)) return '演示流程中，交付时间由制作方确认。正式版会根据你选的方案展示预计工期，并写入订单。';
  if (/修改|改图|重做|次数/.test(s)) return '每笔订单包含最多 3 轮方案内修改。建议一次汇总同一轮所有修改意见，确认提交后由制作方受理；制作错误的修正不占用次数。';
  if (/照片|人物|宠物|图片|角色/.test(s)) return '请尽量提供主体清晰的正面参考图，并告诉我必须保留的发型、服装、花色或其他识别特征。';
  if (/价格|多少钱|付款|付费/.test(s)) return '这是朋友体验版，不会收款。正式版会在确认方案后展示报价与收款二维码，收款需制作方人工核实。';
  if (/微信|LINE|格式|尺寸/.test(s)) return '制作平台可以选择微信、LINE 或两者。你只需提供参考图；不同平台的图片规格由后续的交付工具处理。';
  return '已记下这项补充要求。请继续说明细节，完成后点击「整理制作需求」，核对清单再提交。此回复为预设规则演示，尚未接入真实 AI。';
}
