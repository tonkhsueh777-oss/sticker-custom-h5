// 表情研究所 V0.2：客户无需登录；管理员通过 Supabase 邮箱链接验证。
// 浏览器只有公开 publishable key；所有订单权限由云端 Edge Function 验证。
const BASE="https://tzebvgfhhfikeuccavqn.supabase.co";
const KEY="sb_publishable_NNs5TOCt_kKBRYirVNCzvg_4rDSJviM";
const ENDPOINT=BASE+"/functions/v1/sticker-api";
const ACCESS="sticker-v02-cloud-access",SESSION="sticker-v02-admin-session";
const HEADERS={"Content-Type":"application/json","apikey":KEY};
let session=null;
const loadSession=()=>{try{return JSON.parse(localStorage.getItem(SESSION)||"null")}catch{return null}};
const storeSession=s=>{session=s;s?localStorage.setItem(SESSION,JSON.stringify(s)):localStorage.removeItem(SESSION)};
export function consumeAuthCallback(){
 if(!location.hash.startsWith("#access_token="))return false;
 const p=new URLSearchParams(location.hash.slice(1));
 const access_token=p.get("access_token"),refresh_token=p.get("refresh_token");
 if(!access_token||!refresh_token)return false;
 storeSession({access_token,refresh_token,expires_at:Math.floor(Date.now()/1000)+Number(p.get("expires_in")||3600)-60});
 history.replaceState(null,"",location.pathname+"#/admin");return true;
}
export async function adminSession(){
 if(!session)session=loadSession();if(!session)return null;
 if(Date.now()/1000<session.expires_at)return session;
 const res=await fetch(BASE+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:HEADERS,body:JSON.stringify({refresh_token:session.refresh_token})});
 if(!res.ok){storeSession(null);return null}
 const data=await res.json();storeSession({access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Math.floor(Date.now()/1000)+Number(data.expires_in||3600)-60});return session;
}
export async function cloud(action,payload={},withAdmin=false){
 let authorization=KEY;
 if(withAdmin){const s=await adminSession();if(!s?.access_token)throw Error("请先登录管理员账号");authorization=s.access_token}
 const res=await fetch(ENDPOINT,{method:"POST",headers:{...HEADERS,Authorization:"Bearer "+authorization},body:JSON.stringify({action,...payload})});
 const data=await res.json().catch(()=>({error:"云端未返回有效结果"}));
 if(!res.ok||data.error)throw Error(data.error||"云端请求失败："+res.status);
 return data;
}
export function accesses(){try{const a=JSON.parse(localStorage.getItem(ACCESS)||"[]");return Array.isArray(a)?a:[]}catch{return []}}
export function saveAccess(id,token){if(!id||!token)return;const a=accesses().filter(x=>x.id!==id);a.unshift({id,token});localStorage.setItem(ACCESS,JSON.stringify(a.slice(0,40)))}
export const findAccess=id=>accesses().find(a=>a.id===id);
export const orderLink=(id,token)=>location.origin+location.pathname+"#/orders/"+encodeURIComponent(id)+"/"+encodeURIComponent(token);
export async function loadMyOrders(){const rows=[];for(const a of accesses().slice(0,20)){try{rows.push((await cloud("get_order",{orderId:a.id,token:a.token})).order)}catch{}}return rows}
export async function adminLogin(email){
 const redirect=location.origin+location.pathname+"#/admin";
 const url=BASE+"/auth/v1/otp?redirect_to="+encodeURIComponent(redirect);
 const r=await fetch(url,{method:"POST",headers:HEADERS,body:JSON.stringify({email,create_user:true})});
 if(!r.ok){const d=await r.json().catch(()=>({}));throw Error(d.msg||d.message||d.error_description||"发送邮箱验证失败")}
}
export async function adminLogout(){
 const s=await adminSession();if(s?.access_token)await fetch(BASE+"/auth/v1/logout",{method:"POST",headers:{...HEADERS,Authorization:"Bearer "+s.access_token}}).catch(()=>{});
 storeSession(null);
}
export async function adminOrders(){return (await cloud("admin_list",{},true)).orders}
export async function uploadFile(file,orderId,kind){
 const e=(file.name.split(".").pop()||"").toLowerCase();
 const ext=kind==="zip"?"zip":(["png","jpg","jpeg","webp"].includes(e)?e:"png");
 const signed=await cloud("admin_prepare_upload",{orderId,kind,ext},true);
 const form=new FormData();form.append("cacheControl","3600");form.append("",file);
 const r=await fetch(signed.signedUrl,{method:"PUT",headers:{"x-upsert":"false"},body:form});
 if(!r.ok)throw Error("文件上传失败："+r.status+" "+await r.text());
 return signed.path;
}
export const configuredAdminEmail="tonkhsueh777@gmail.com";
