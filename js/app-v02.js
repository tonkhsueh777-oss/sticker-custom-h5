import {TEMPLATES, EXPRESSIONS, DEFAULT_BOT_MESSAGES} from './data.js';
import {safeText as esc, shortDate, templateName, platformName, stateLabel, buildSummary, createOrder, validOrderPayload, replyFromRules} from './helpers.js';
import {downscaleImage, copyText, downloadBlob} from './storage.js';
import {cloud, saveAccess, findAccess, orderLink, loadMyOrders, adminLogin, adminLogout, adminSession, adminOrders as getAdminOrders, uploadFile, configuredAdminEmail, consumeAuthCallback} from './cloud.js';

const app=document.getElementById('app');
let orders=[];
let adminRows=[];
let adminState='loading';
let clientOrderId='';
let adminOrderId='';
let wizardStep=1;
let previewFiles=[];
let zipFile=null;
let toastTimer;
let draft=newDraft();

function newDraft(){return {templateId:'chibi',platform:'wechat',count:16,kind:'static',nickname:'',notes:'',referenceData:'',referenceName:'',expressions:EXPRESSIONS.slice(0,16),chat:DEFAULT_BOT_MESSAGES.map(x=>({...x})),confirmed:false};}
function notify(message){document.querySelector('.toast')?.remove();const item=document.createElement('div');item.className='toast';item.textContent=message;document.body.append(item);clearTimeout(toastTimer);toastTimer=setTimeout(()=>item.remove(),3600);}
function save(){} // Supabase saves cloud orders.
function mutateOrder(id,callback){const index=orders.findIndex(o=>o.id===id);if(index<0)return;callback(orders[index]);orders[index].updatedAt=new Date().toISOString();save();render();}
function navigate(path){const next='#'+path;if(location.hash===next){render();window.scrollTo({top:0,behavior:'smooth'});}else location.hash=next;}
function viewName(){const hash=location.hash.replace(/^#/,'')||'/';return hash.startsWith('/orders/')?'/orders':(['/','/templates','/create','/orders','/admin'].includes(hash)?hash:'/');}
function navLink(path,label,icon=''){const active=viewName()===path?'active':'';return `<a href="#${path}" class="${active}">${icon?`<b>${icon}</b>`:''}${label}</a>`;}
function layout(content){return `<div class="site-shell"><header class="topbar"><div class="bar-inner"><a class="brand" href="#/"><img src="./assets/logo.svg" alt="表情研究所图标"/>表情研究所 <em>STICKER LAB</em></a><nav class="nav">${navLink('/','首页')}${navLink('/templates','风格模板')}${navLink('/orders','测试订单')}${navLink('/admin','管理后台')}</nav><div class="top-actions"><span class="pill" style="font-size:10px">V0.2 云端测试</span><a class="button small" href="#/create">开始定制 ↗</a></div></div></header><main class="main">${content}</main><footer class="footer"><span>© 表情研究所 · 原创表情包定制 H5 体验项目</span><span>朋友测试 · 云端同步订单 · 不收取真实付款</span></footer><nav class="mobile-nav">${navLink('/','首页','⌂')}${navLink('/templates','模板','▦')}${navLink('/create','定制','✦')}${navLink('/orders','订单','▤')}${navLink('/admin','后台','⚙')}</nav></div>`;}
function styleCard(t,withAction=true){return `<button type="button" class="style-card ${draft.templateId===t.id&&viewName()==='/create'?'selected':''}" data-action="choose-template" data-id="${t.id}"><img class="art-img" src="${t.image}" alt="${esc(t.name)}原创示意素材" loading="lazy"/><div class="style-meta"><div class="style-topline"><strong>${esc(t.name)}</strong><span class="arrow-sign">↗</span></div><p>${esc(t.tagline)}</p><div class="style-tags">${t.tags.map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div></div></button>`;}
function home(){return `<section class="hero"><div class="hero-copy"><span class="pill">一张参考图 · 一整套专属表情</span><h1>让每一种表情，<br/><span>都有你的样子。</span></h1><p>人物、宠物、品牌 IP，都能变成更有个性的聊天表情。从挑选风格到确认制作需求，我们把流程做得简单一点。</p><div class="hero-actions"><a class="button" href="#/create">开始定制体验 <span>↗</span></a><a class="button ghost" href="#/templates">看看创作风格</a></div><div class="light-note" style="margin-top:25px;background:transparent;padding:0">朋友测试版：云端保存订单、不收款，客服仍是模拟回复。</div></div><div class="hero-art"><div class="spark">✳</div><div class="bubble" style="--top:85px;--left:4%;--rot:-14deg"><img src="./assets/chibi.svg" alt="萌趣贴图示例"/></div><div class="bubble" style="--top:44px;--left:36%;--rot:7deg"><img src="./assets/pet.svg" alt="宠物贴图示例"/></div><div class="bubble" style="--top:150px;--left:64%;--rot:13deg"><img src="./assets/clay.svg" alt="潮玩贴图示例"/></div><div class="stamp">HELLO! / THANKS! / YEAH!</div></div></section>
<section class="section"><div class="section-intro"><div><div class="eyebrow">PICK YOUR STYLE</div><h2>先选一个喜欢的风格</h2><p class="lead">六种视觉方向，保留角色特征，让每张表情都有辨识度。</p></div><a class="section-link" href="#/templates">查看全部模板 →</a></div><div class="style-grid">${TEMPLATES.slice(0,3).map(t=>styleCard(t)).join('')}</div></section>
<section class="section"><div class="section-intro"><div><div class="eyebrow">HOW IT WORKS</div><h2>三步，开始你的专属定制</h2><p class="lead">无需注册，直接开始。</p></div></div><div class="steps"><div class="step-card"><div class="step-no">01.</div><h3>选择方案</h3><p>选喜欢的风格、微信或 LINE、8／16／24 张静态表情。</p></div><div class="step-card"><div class="step-no">02.</div><h3>上传一张图</h3><p>提供人物照片、宠物或现有 IP 图，补充想保留的特征。</p></div><div class="step-card"><div class="step-no">03.</div><h3>确认需求</h3><p>体验客服沟通与制作清单，提交测试订单并给出反馈。</p></div></div></section>
<section class="section"><div class="highlight-strip"><div><h2>你提供创意，我们负责把流程变简单。</h2><p>从表情需求整理、制作反馈到最终文件交付，一次体验完整路径。</p></div><a href="#/create" class="button mint">立即体验 ↗</a></div></section>`;}
function templatesPage(){return `<div class="page-head"><div class="eyebrow">THE STYLE COLLECTION</div><h1 class="page-title">选择你的专属表情风格</h1><p class="page-subtitle">以下为原创演示素材，正式制作时会以客户提供的参考图为基础。</p></div><div class="template-banner"><div><span class="pill">风格可以选，角色由你定</span><h2 style="margin:17px 0 10px">从一张图，延展出一整组情绪。</h2><p>上传人物、宠物或 IP 的清晰照片，按确认好的表情清单定制。第一版以静态表情为主。</p></div><div class="template-iconline"><span>♡</span><span>✿</span><span>✦</span><span>☺</span></div></div><div class="style-grid">${TEMPLATES.map(t=>styleCard(t)).join('')}</div>`;}
function option(label,detail,name,value,current){return `<button type="button" class="option ${current===value?'on':''}" data-action="select-option" data-name="${name}" data-value="${value}"><strong>${label}</strong><span>${detail}</span></button>`;}
function stepOne(){return `<div class="form-section"><label class="label-line">01 / 选择风格</label><div class="style-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:9px">${TEMPLATES.map(t=>`<button class="style-card ${draft.templateId===t.id?'selected':''}" type="button" data-action="select-option" data-name="templateId" data-value="${t.id}"><img class="art-img" src="${t.image}" alt="${esc(t.name)}" style="height:97px"/><div class="style-meta" style="padding:7px 4px"><strong style="font-size:12px">${esc(t.name)}</strong></div></button>`).join('')}</div></div>
<div class="form-section"><label class="label-line">02 / 选择制作平台</label><div class="select-grid">${option('微信','微信表情包','platform','wechat',draft.platform)}${option('LINE','LINE 贴图','platform','line',draft.platform)}${option('双平台','微信 + LINE','platform','both',draft.platform)}</div></div>
<div class="form-section"><label class="label-line">03 / 表情数量</label><div class="select-grid">${option('8 张','体验选项','count','8',String(draft.count))}${option('16 张','默认推荐','count','16',String(draft.count))}${option('24 张','完整表情组','count','24',String(draft.count))}</div><div class="sublabel">这是测试版数量选择。正式投稿的支持规格以平台审核规则为准。</div></div><div class="form-section"><label class="label-line" for="nickname">04 / 客户称呼（可选）</label><input class="input" id="nickname" maxlength="50" placeholder="例如：小林、某某工作室" value="${esc(draft.nickname)}" data-draft="nickname"/></div><div class="light-note">当前只开放静态表情演示。动态表情、在线收款及自动上架暂不包含在 V0.1。</div><div class="action-row"><button class="button" data-action="wizard-next">下一步：上传参考图 →</button></div>`;}
function stepTwo(){return `<div class="form-section"><label class="label-line">上传一张参考图片</label><div class="upload-zone"><input type="file" id="referenceInput" accept="image/png,image/jpeg,image/webp" aria-label="上传参考图片"/>${draft.referenceData?`<div><img src="${draft.referenceData}" alt="参考图预览"/><small>${esc(draft.referenceName)} · 点击更换</small></div>`:`<div><div class="up-icon">↑</div><strong>点击选择照片或角色图</strong><small>JPG / PNG / WebP，最大 12 MB<br/>图片在提交订单时上传到私有云存储</small></div>`}</div><div class="sublabel">确认订单后，参考图会上传到私有云存储，制作方从后台查看。</div></div>
<div class="form-section"><label for="notes" class="label-line">你希望保留哪些角色特征？</label><textarea id="notes" class="textarea" maxlength="1500" data-draft="notes" placeholder="例如：保留短发、圆框眼镜、蓝色上衣；表情活泼，但不要改变人物脸型。">${esc(draft.notes)}</textarea><div class="sublabel">可以写服装、发型、颜色、不能改变的特征，以及想要的表情感觉。</div></div><div class="action-row"><button class="button ghost" data-action="wizard-back">← 上一步</button><button class="button" data-action="wizard-next">下一步：需求确认 →</button></div>`;}
function stepThree(){return `<div class="form-section"><label class="label-line">体验 AI 客服沟通方式</label><p class="sublabel">本版是关键词预设回复，尚未接入真实大模型。你发出的消息会进入制作需求单。</p><div class="chat-window"><div class="chat-messages" id="chatMessages">${draft.chat.map(m=>`<div class="chat-message ${m.role==='user'?'user':'bot'}">${esc(m.text)}</div>`).join('')}</div><form class="chat-entry" id="chatForm"><input id="chatInput" maxlength="500" placeholder="告诉我你还想补充什么…" aria-label="客服消息"/><button type="submit" class="button small">发送 ↗</button></form></div><div class="quick-prompts"><button data-action="quick-chat" data-message="修改有几次？">修改有几次？</button><button data-action="quick-chat" data-message="要保留人物原有的发型、服装和五官">保留人物特征</button><button data-action="quick-chat" data-message="需要做微信和LINE双平台表情">关于双平台</button></div></div>
<div class="form-section"><label class="label-line">确认每张表情内容（可修改）</label><div class="expr-grid">${draft.expressions.map((v,i)=>`<div class="expr-input"><label for="expression-${i}">第 ${String(i+1).padStart(2,'0')} 张</label><input id="expression-${i}" maxlength="40" data-expression="${i}" value="${esc(v)}"/></div>`).join('')}</div></div>
<div class="form-section"><label class="label-line">最终制作需求摘要</label><div class="summary-card"><div class="summary-title">客户确认版本 · DRAFT</div><div class="pre-line" id="summaryText">${esc(buildSummary(draft))}</div><button class="button small ghost" data-action="refresh-summary" style="margin-top:13px">刷新摘要</button></div><label class="checkline"><input type="checkbox" id="confirmNeed" ${draft.confirmed?'checked':''}/>我已检查表情数量、内容、角色特征，确认此份演示需求单。</label></div><div class="action-row"><button class="button ghost" data-action="wizard-back">← 上一步</button><button class="button" data-action="place-order">提交测试订单 →</button></div>`;}
function createPage(){const steps=['选择方案','上传一张图','客服沟通与确认'];return `<div class="page-head"><div class="eyebrow">CREATE YOUR STICKERS</div><h1 class="page-title">开始你的表情包定制</h1><p class="page-subtitle">不用注册，不用付款。朋友测试版只演示操作与制作沟通流程。</p></div><div class="panel-grid"><section class="card"><div class="wizard-steps">${steps.map((s,i)=>`<span class="${wizardStep===i+1?'current':wizardStep>i+1?'done':''}">${i+1}. ${s}</span>`).join('')}</div>${wizardStep===1?stepOne():wizardStep===2?stepTwo():stepThree()}</section><aside><div class="card"><div class="mini-asset"><img src="${TEMPLATES.find(t=>t.id===draft.templateId)?.image}" alt="选择的风格"/><div><strong>${esc(templateName(draft.templateId))}</strong><p class="sublabel" style="margin:5px 0 0">当前选择的创作风格</p></div></div><div class="divider"></div><div class="summary-card"><div class="summary-title">订单配置</div><div class="summary-row"><span>制作平台</span><strong>${esc(platformName(draft.platform))}</strong></div><div class="summary-row"><span>类型</span><strong>静态表情</strong></div><div class="summary-row"><span>数量</span><strong>${draft.count} 张</strong></div><div class="summary-row"><span>参考图片</span><strong>${draft.referenceName?'已选择':'等待上传'}</strong></div><div class="summary-row"><span>费用</span><strong>体验免付费</strong></div></div><div class="light-note warning-note" style="margin-bottom:0">本版仍不收款；提交后会自动云端保存，制作方电脑后台直接接单。</div></div></aside></div>`;}
function noOrders(label){return `<div class="empty-state"><div class="empty-icon">✦</div><h3>${esc(label)}</h3><p>先从一次完整的模拟定制开始。<br/>订单会储存在云端。</p><a href="#/create" class="button" style="margin-top:11px">创建测试订单 ↗</a></div>`;}
function orderSidebar(selected,rows=orders){return `<div class="order-list">${rows.map(o=>`<button class="order-row ${o.id===selected?'on':''}" data-action="${viewName()==='/admin'?'choose-admin-order':'choose-client-order'}" data-id="${esc(o.id)}"><strong>${esc(o.nickname||'未命名客户')} · ${o.count} 张</strong><p>${esc(o.id)}</p><div class="bottom"><span>${shortDate(o.createdAt)}</span><span class="badge ${o.status==='review'?'blue':''}">${esc(stateLabel(o.status))}</span></div></button>`).join('')}</div>`;}
function previews(o){return o.previewImages?.length?`<div class="preview-grid">${o.previewImages.map((im,i)=>`<div class="preview-item"><img src="${im.data}" alt="第 ${i+1} 张表情预览"/><small>${String(i+1).padStart(2,'0')} · ${esc(o.expressions[i]||im.name)}</small></div>`).join('')}</div>`:`<div class="light-note">暂无作品预览。制作方上传后可在这里查看。</div>`;}
function chatLog(o){return `<details style="margin-top:13px"><summary style="font-size:13px;font-weight:700;cursor:pointer">展开沟通记录（${o.chat?.length||0} 条）</summary><div style="margin-top:10px">${(o.chat||[]).map(m=>`<div class="revision-box"><strong style="font-size:11px">${m.role==='user'?'客户':'模拟客服'}</strong><p>${esc(m.text)}</p></div>`).join('')}</div></details>`;}
function clientOrder(o){const pending=o.revisions?.find(r=>r.status==='pending');const accepted=o.revisions?.find(r=>r.status==='accepted'||r.status==='correction');const canReview=o.status==='review'&&!pending;return `<div class="card"><div class="detail-head"><div><span class="pill">客户订单详情</span><h2 style="margin:12px 0 8px">${esc(o.nickname||'我的表情')} · ${o.count} 张</h2><p class="smalltext muted">${esc(o.id)} · ${shortDate(o.createdAt)}</p></div><span class="badge ${o.status==='review'?'blue':''}">${esc(stateLabel(o.status))}</span></div><div class="stat-grid"><div class="stat"><span>模板</span><strong>${esc(templateName(o.templateId))}</strong></div><div class="stat"><span>平台</span><strong>${esc(platformName(o.platform))}</strong></div><div class="stat"><span>剩余修改</span><strong>${3-o.roundsUsed} / 3 轮</strong></div></div><div class="light-note">订单已经上传云端。请复制保存专属订单链接，下次可以继续查看和反馈。</div><div class="action-row"><button class="button ghost small" data-action="copy-order-link" data-id="${o.id}">复制专属订单链接</button><button class="button ghost small" data-action="copy-summary" data-id="${o.id}">复制制作需求</button></div><div class="divider"></div><h3>制作需求单</h3><div class="summary-card"><div class="pre-line">${esc(o.summary)}</div></div><div class="divider"></div><h3>作品预览 ${o.deliveryCount?`<span class="badge">V1.${o.deliveryCount-1}</span>`:''}</h3>${previews(o)}${o.deliveryKey?`<div class="action-row"><button class="button mint" data-action="download-zip" data-id="${o.id}">↓ 下载成品 ZIP</button></div>`:''}<div class="divider"></div><h3>提交修改意见</h3><p class="smalltext muted">普通沟通不扣次数。正式修改工单由管理员受理时才计入一轮。</p>${(o.revisions||[]).map((r,i)=>`<div class="revision-box"><strong>修改申请 ${i+1}</strong> <span class="badge ${r.status==='pending'?'soft':''}">${r.status==='pending'?'等待受理':r.status==='accepted'?`第 ${r.round} 轮修改`:r.status==='correction'?'制作纠错（不计次数）':'已处理'}</span><p>${esc(r.text)}</p><div class="tiny">${shortDate(r.createdAt)}</div></div>`).join('')}${pending?`<div class="light-note warning-note">有一份修改意见正在等待制作方确认，请勿重复提交。</div>`:accepted?`<div class="light-note">制作方正在处理已受理的修改意见。</div>`:canReview&&o.roundsUsed<3?`<label class="input-label" for="revisionText">本轮所有修改意见（可逐张编号）</label><textarea class="textarea" id="revisionText" placeholder="例如：第03张表情改为大笑；第07张衣服改成绿色……"></textarea><div class="action-row"><button class="button ghost" data-action="submit-revision" data-id="${o.id}">提交本轮修改</button><button class="button" data-action="accept-final" data-id="${o.id}">作品满意，确认完成</button></div>`:canReview?`<div class="light-note warning-note">3 轮修改次数已使用完毕。如发现制作方错误，请联系制作方协商处理。</div><div class="action-row"><button class="button" data-action="accept-final" data-id="${o.id}">确认成品完成</button></div>`:o.status==='done'?`<div class="light-note">此订单已完成。感谢参与测试！</div>`:`<div class="light-note">作品提交后，这里才会开放修改申请。你可以先在下方补充沟通意见。</div>`}<div class="divider"></div><h3>需求沟通记录 <span class="badge soft">模拟客服</span></h3>${chatLog(o)}<form class="chat-entry" id="orderChatForm" data-id="${o.id}" style="margin-top:13px;border:1px solid #e5ebe5;border-radius:13px"><input id="orderChatInput" maxlength="500" placeholder="补充需求或询问制作进度（不扣修改次数）"/><button class="button small" type="submit">发送</button></form></div>`;}
function ordersPage(){const target=orders.find(o=>o.id===clientOrderId)||orders[0];if(target)clientOrderId=target.id;return `<div class="page-head"><div class="eyebrow">MY CLOUD ORDERS</div><h1 class="page-title">我的测试订单</h1><p class="page-subtitle">订单已云端保存；跨设备使用须保存并打开专属订单链接。</p></div>${orders.length?`<div class="order-layout"><aside>${orderSidebar(clientOrderId)}</aside>${clientOrder(target)}</div>`:noOrders('还没有测试订单')}`;}
function adminOrder(o){const pending=o.revisions?.find(r=>r.status==='pending');return `<div class="card"><div class="detail-head"><div><span class="pill">后台制作任务</span><h2 style="margin:12px 0 8px">${esc(o.nickname||'未命名客户')} · ${o.count} 张静态</h2><p class="smalltext muted">${esc(o.id)} · ${shortDate(o.createdAt)}</p></div><span class="badge">${esc(stateLabel(o.status))}</span></div><div class="stat-grid"><div class="stat"><span>平台</span><strong>${esc(platformName(o.platform))}</strong></div><div class="stat"><span>交付版本</span><strong>${o.deliveryCount?`V1.${o.deliveryCount-1}`:'未交付'}</strong></div><div class="stat"><span>修改已用</span><strong>${o.roundsUsed} / 3</strong></div></div><div class="summary-card"><div class="summary-title">客户已确认的制作任务单（测试）</div><div class="pre-line">${esc(o.summary)}</div></div><div class="action-row"><button class="button ghost small" data-action="copy-summary" data-id="${o.id}">复制完整任务单</button>${o.referenceData?`<button class="button ghost small" data-action="download-reference" data-id="${o.id}">↓ 下载客户参考图</button>`:''}${o.status==='new'?`<button class="button small" data-action="start-making" data-id="${o.id}">开始制作</button>`:''}</div>${o.referenceData?`<div class="mini-asset" style="margin-top:19px"><img src="${o.referenceData}" alt="客户参考图片" style="height:95px;width:110px;object-fit:contain"/><div><strong>客户参考图</strong><p class="sublabel">${esc(o.referenceName)}</p></div></div>`:''}<div class="divider"></div><h3>修改工单</h3>${o.revisions?.length?o.revisions.map((r,i)=>`<div class="revision-box"><strong>申请 ${i+1}</strong> <span class="badge ${r.status==='pending'?'soft':''}">${r.status==='pending'?'待受理':r.status==='accepted'?`第 ${r.round} 轮`:r.status==='correction'?'纠错不扣次数':'已处理'}</span><p>${esc(r.text)}</p>${r.status==='pending'?`<div class="action-row"><button class="button small" data-action="accept-revision" data-id="${o.id}" data-rev="${r.id}" ${o.roundsUsed>=3?'disabled':''}>受理为第 ${o.roundsUsed+1} 轮</button><button class="button small ghost" data-action="accept-correction" data-id="${o.id}" data-rev="${r.id}">认定制作纠错（不扣次）</button></div>`:''}</div>`).join(''):`<div class="light-note">暂时没有修改请求。</div>`}${pending&&o.roundsUsed>=3?`<p class="smalltext muted">该订单免费修改已达上限，请与客户另行协商。</p>`:''}<div class="divider"></div><h3>上传作品预览与交付 ZIP</h3><p class="smalltext muted">上传预览图片和可选的 ZIP，系统将保存至私有云存储，客户刷新后即可查看。</p><label class="input-label" for="previewFiles">预览表情图片（最多 24 张）</label><input class="file-input" type="file" id="previewFiles" accept="image/png,image/jpeg,image/webp" multiple/><label class="input-label" for="zipFile">最终 ZIP 压缩包（可选，最大 25 MB）</label><input class="file-input" type="file" id="zipFile" accept=".zip,application/zip,application/x-zip-compressed"/><div class="action-row"><button class="button" data-action="deliver" data-id="${o.id}">保存交付版本，通知客户预览</button></div><div class="light-note warning-note">上传成功后，客户刷新专属订单页便能查看新的交付版本。</div><div class="divider"></div><h3>已交付预览</h3>${previews(o)}${chatLog(o)}</div>`;}
function adminPage(){
 if(adminState!=="ready") return `<div class="page-head"><div class="eyebrow">OWNER DASHBOARD</div><h1 class="page-title">管理员安全登录</h1><p class="page-subtitle">只有管理员邮箱可以读取全部订单，朋友下单不需要账号。</p></div><div class="card" style="max-width:490px;margin:auto"><h3>${adminState==="loading"?"正在检查登录状态…":"邮箱验证登录"}</h3><p class="smalltext muted">填写自己的管理员邮箱，系统会发送登录链接，点击链接即可进入后台。</p><form id="adminLoginForm" class="form-section"><label class="label-line" for="adminEmail">管理员邮箱</label><input class="input" type="email" id="adminEmail" autocomplete="email" required value="${esc(configuredAdminEmail)}"/><div class="action-row"><button type="submit" class="button">发送安全登录邮件 ↗</button></div></form><div class="light-note">首次使用前，需在 Supabase Auth 的 URL Configuration 中允许当前 GitHub Pages 网站地址。</div></div>`;
 const o=adminRows.find(x=>x.id===adminOrderId)||adminRows[0];if(o)adminOrderId=o.id;
 const counts={new:0,making:0,review:0,revision:0,done:0};adminRows.forEach(x=>{counts[x.status]=(counts[x.status]||0)+1});
 return `<div class="page-head"><div class="eyebrow">OWNER DASHBOARD / CLOUD</div><h1 class="page-title">制作管理后台</h1><p class="page-subtitle">朋友手机订单同步至云端，电脑与手机都可以管理。</p></div><div class="action-row" style="margin-bottom:18px"><button class="button small" data-action="refresh-admin">↻ 刷新订单</button><button class="button ghost small" data-action="admin-logout">退出管理员登录</button></div><div class="metric-cards"><div class="metric"><strong>${adminRows.length}</strong><span>云端订单</span></div><div class="metric"><strong>${counts.new+counts.making}</strong><span>待制作／制作中</span></div><div class="metric"><strong>${counts.review}</strong><span>等待客户确认</span></div><div class="metric"><strong>${counts.revision}</strong><span>修改中</span></div></div>${o?`<div class="admin-layout"><aside>${orderSidebar(adminOrderId,adminRows)}</aside>${adminOrder(o)}</div>`:`<div class="empty-state"><h3>还没有云端订单</h3><p>让朋友在手机提交订单，再点击刷新订单。</p></div>`}`;
}
function render(){let page;switch(viewName()){case '/templates':page=templatesPage();break;case '/create':page=createPage();break;case '/orders':page=ordersPage();break;case '/admin':page=adminPage();break;default:page=home();}app.innerHTML=layout(page);const msgs=document.getElementById('chatMessages');if(msgs)msgs.scrollTop=msgs.scrollHeight;}

function ensureDraftInput(){document.querySelectorAll('[data-draft]').forEach(el=>{draft[el.dataset.draft]=el.value;});document.querySelectorAll('[data-expression]').forEach(el=>{draft.expressions[Number(el.dataset.expression)]=el.value.trim()||EXPRESSIONS[Number(el.dataset.expression)]||'表情';});draft.confirmed=!!document.getElementById('confirmNeed')?.checked;}
function uploadRef(file){if(!file)return;downscaleImage(file,960,.72).then(data=>{draft.referenceData=data;draft.referenceName=file.name;render();notify('已在浏览器中保存参考图预览');}).catch(err=>notify(err.message));}
function appendChat(text,afterOrder=''){const message=String(text||'').trim().slice(0,500);if(!message)return;const reply=replyFromRules(message);if(afterOrder){mutateOrder(afterOrder,o=>{o.chat.push({role:'user',text:message},{role:'bot',text:reply});o.chat=o.chat.slice(-30);});}else{ensureDraftInput();draft.chat.push({role:'user',text:message},{role:'bot',text:reply});render();}notify('演示客服已回复');}
function replaceClientOrder(o){orders=orders.filter(x=>x.cloudId!==o.cloudId);orders.unshift(o);clientOrderId=o.id;render();}
function replaceAdminOrder(o){adminRows=adminRows.map(x=>x.cloudId===o.cloudId?o:x);if(!adminRows.some(x=>x.cloudId===o.cloudId))adminRows.unshift(o);adminOrderId=o.id;render();}
async function refreshOneClient(id){const o=orders.find(x=>x.id===id),access=o&&findAccess(o.cloudId);if(!access)throw Error("找不到当前订单的访问链接");replaceClientOrder((await cloud("get_order",{orderId:access.id,token:access.token})).order);}
async function refreshAdmin(){
 adminState="loading";render();
 try{
  const ss=await adminSession();
  if(!ss){adminState="login";adminRows=[];render();return;}
  adminRows=await getAdminOrders();adminState="ready";render();
  const selected=adminRows.find(x=>x.id===adminOrderId)||adminRows[0];
  if(selected)await loadAdminDetail(selected.cloudId);
 }catch(e){adminState="login";adminRows=[];render();notify(e.message);}
}
async function loadAdminDetail(cloudId){const r=await cloud("admin_get",{orderId:cloudId},true);replaceAdminOrder(r.order);}
async function placeOrder(){
 ensureDraftInput();
 if(!draft.referenceData){notify("请先上传一张参考图");wizardStep=2;render();return;}
 if(!draft.confirmed){notify("请先勾选确认制作需求");return;}
 const btn=document.querySelector('[data-action="place-order"]');
 if(btn){btn.disabled=true;btn.textContent="正在提交至云端…";}
 try{
  const r=await cloud("create_order",{...draft,summary:buildSummary(draft)});
  saveAccess(r.orderId,r.token);orders.unshift(r.order);clientOrderId=r.order.id;
  wizardStep=1;draft=newDraft();navigate("/orders");notify("订单已同步到云端，你可以复制专属链接保存。");
 }catch(e){notify("提交失败："+e.message);}
 finally{if(btn){btn.disabled=false;btn.textContent="提交测试订单 →";}}
}
async function applyRevision(id){
 const content=String(document.getElementById("revisionText")?.value||"").trim();
 if(content.length<3){notify("请写清楚本轮修改意见");return;}
 try{
  const o=orders.find(x=>x.id===id),ac=findAccess(o.cloudId);
  const r=await cloud("submit_revision",{orderId:o.cloudId,token:ac.token,text:content});
  replaceClientOrder(r.order);notify("本轮意见已提交云端，等待受理（暂不扣次数）");
 }catch(e){notify(e.message);}
}
async function acceptRevision(id,rid,correction=false){
 try{const o=adminRows.find(x=>x.id===id);await cloud("admin_accept",{orderId:o.cloudId,revisionId:rid,correction},true);await loadAdminDetail(o.cloudId);notify(correction?"已受理制作纠错（不扣次数）":"已受理修改，计入一轮");}catch(e){notify(e.message);}
}
async function deliver(id){
 if(!previewFiles.length){notify("请选择至少一张预览图片");return;}
 if(previewFiles.length>24){notify("预览图片不能超过24张");return;}
 if(zipFile&&zipFile.size>25*1024*1024){notify("ZIP 大于25MB，请压缩");return;}
 const o=adminRows.find(x=>x.id===id),btn=document.querySelector('[data-action="deliver"]');
 if(btn){btn.disabled=true;btn.textContent="正在上传云端…";}
 try{
  const paths=[];
  for(let i=0;i<previewFiles.length;i++){
   const data=await downscaleImage(previewFiles[i],640,.75);
   const blob=await(await fetch(data)).blob();
   const file=new File([blob],String(i+1).padStart(2,"0")+".webp",{type:"image/webp"});
   paths.push(await uploadFile(file,o.cloudId,"preview"));
   if(btn)btn.textContent=`上传中 ${i+1}/${previewFiles.length}…`;
  }
  let zipPath="";if(zipFile)zipPath=await uploadFile(zipFile,o.cloudId,"zip");
  await cloud("admin_deliver",{orderId:o.cloudId,previewPaths:paths,zipPath,zipName:zipFile?.name||""},true);
  previewFiles=[];zipFile=null;await loadAdminDetail(o.cloudId);notify("交付已上传云端，客户刷新即可查看。");
 }catch(e){notify("交付失败："+e.message);}
 finally{if(btn){btn.disabled=false;btn.textContent="保存交付版本，通知客户预览";}}
}
async function downloadZip(id){const o=orders.find(x=>x.id===id);if(o?.zipUrl)window.open(o.zipUrl,"_blank","noopener");else notify("还没有可以下载的ZIP");}
async function downloadReference(id){const o=adminRows.find(x=>x.id===id);if(o?.referenceData)window.open(o.referenceData,"_blank","noopener");else notify("没有找到参考图");}
async function appendAfterOrder(text,id){
 const msg=String(text||"").trim().slice(0,500);if(!msg)return;
 try{const o=orders.find(x=>x.id===id),ac=findAccess(o.cloudId);const r=await cloud("add_chat",{orderId:o.cloudId,token:ac.token,message:msg});replaceClientOrder(r.order);notify("模拟客服已回复");}
 catch(e){notify("发送失败："+e.message);}
}
async function initCloud(){
 try{
  consumeAuthCallback();
  const hash=decodeURIComponent(location.hash.slice(1));
  const match=/^\/orders\/([0-9a-f-]{36})\/([a-zA-Z0-9_-]{40,})$/.exec(hash);
  if(match){saveAccess(match[1],match[2]);history.replaceState(null,"",location.pathname+"#/orders");}
  orders=await loadMyOrders();if(orders.length)clientOrderId=orders[0].id;
  render();if(viewName()==="/admin")await refreshAdmin();else adminState="login";
 }catch(e){notify("云端连接失败："+e.message);adminState="login";render();}
}
app.addEventListener('input',e=>{
 const el=e.target;
 if(el.dataset.draft){draft[el.dataset.draft]=el.value; if(el.dataset.draft==='notes')draft.confirmed=false;}
 if(el.dataset.expression!==undefined){draft.expressions[Number(el.dataset.expression)]=el.value;draft.confirmed=false;}
 if(el.id==='confirmNeed')draft.confirmed=el.checked;
});
app.addEventListener('change',e=>{
 const el=e.target;
 if(el.id==='referenceInput')uploadRef(el.files?.[0]);
 if(el.id==='previewFiles'){previewFiles=Array.from(el.files||[]);notify(`已选择 ${previewFiles.length} 张预览图片`);}
 if(el.id==='zipFile'){zipFile=el.files?.[0]||null;if(zipFile)notify(`已选择 ${zipFile.name}`);}

 if(el.id==='confirmNeed')draft.confirmed=el.checked;
});
app.addEventListener('submit',e=>{
 if(e.target.id==='chatForm'){e.preventDefault();const v=document.getElementById('chatInput')?.value;appendChat(v);}
 if(e.target.id==='orderChatForm'){e.preventDefault();const v=document.getElementById('orderChatInput')?.value;appendAfterOrder(v,e.target.dataset.id);}
 if(e.target.id==='adminLoginForm'){e.preventDefault();const email=document.getElementById('adminEmail')?.value?.trim();if(email)adminLogin(email).then(()=>notify('登录邮件已发送，请查收并点击登录链接。')).catch(e=>notify(e.message));}
});
app.addEventListener('click',async e=>{
 const el=e.target.closest('[data-action]');if(!el)return;
 const action=el.dataset.action,id=el.dataset.id;
 if(action==='choose-template'){draft.templateId=id;wizardStep=1;navigate('/create');return;}
 if(action==='select-option'){const name=el.dataset.name,value=el.dataset.value;draft[name]=name==='count'?Number(value):value;if(name==='count'){draft.expressions=EXPRESSIONS.slice(0,draft.count);}draft.confirmed=false;render();return;}
 if(action==='wizard-next'){ensureDraftInput();if(wizardStep===2&&!draft.referenceData){notify('请先上传一张参考图');return;}wizardStep=Math.min(3,wizardStep+1);render();window.scrollTo({top:0,behavior:'smooth'});return;}
 if(action==='wizard-back'){ensureDraftInput();wizardStep=Math.max(1,wizardStep-1);render();window.scrollTo({top:0,behavior:'smooth'});return;}
 if(action==='quick-chat'){appendChat(el.dataset.message);return;}
 if(action==='refresh-summary'){ensureDraftInput();document.getElementById('summaryText').textContent=buildSummary(draft);notify('需求单已刷新');return;}
 if(action==='place-order'){placeOrder();return;}
 if(action==='choose-client-order'){clientOrderId=id;render();return;}
 if(action==='choose-admin-order'){adminOrderId=id;previewFiles=[];zipFile=null;const o=adminRows.find(x=>x.id===id);if(o)await loadAdminDetail(o.cloudId);return;}
 if(action==='copy-order-link'){const o=orders.find(x=>x.id===id),a=o&&findAccess(o.cloudId);if(!a){notify('未找到订单链接');return;}try{await copyText(orderLink(a.id,a.token));notify('专属链接已复制，请妥善保存。');}catch(e){notify(e.message);}return;}
 if(action==='copy-summary'){const o=orders.find(x=>x.id===id);if(o){try{await copyText(`订单 ${o.id}\n${o.summary}`);notify('制作需求已复制');}catch{notify('复制失败，请手动选择摘要文字');}}return;}
 if(action==='submit-revision'){applyRevision(id);return;}
 if(action==='accept-final'){if(confirm('确认作品已满意并完成这个测试订单吗？')){try{const o=orders.find(x=>x.id===id),a=findAccess(o.cloudId);await cloud('confirm_final',{orderId:o.cloudId,token:a.token});await refreshOneClient(id);notify('订单已完成');}catch(e){notify(e.message);}}return;}
 if(action==='start-making'){try{const o=adminRows.find(x=>x.id===id);await cloud('admin_start',{orderId:o.cloudId},true);await loadAdminDetail(o.cloudId);notify('已开始制作');}catch(e){notify(e.message);}return;}
 if(action==='accept-revision'){acceptRevision(id,el.dataset.rev,false);return;}
 if(action==='accept-correction'){acceptRevision(id,el.dataset.rev,true);return;}
 if(action==='deliver'){await deliver(id);return;}
 if(action==='download-zip'){await downloadZip(id);return;}
 if(action==='download-reference'){await downloadReference(id);return;}
 if(action==='refresh-admin'){await refreshAdmin();return;}
 if(action==='admin-logout'){await adminLogout();adminState='login';adminRows=[];render();notify('已退出管理员登录');return;}
});
window.addEventListener('hashchange',()=>{render();if(viewName()==='/admin'&&adminState!=='ready')refreshAdmin();window.scrollTo({top:0,behavior:'instant'});});
if(!location.hash)location.hash='#/';render();initCloud();
