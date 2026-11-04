export const TEMPLATES = [
  {id:'chibi', name:'Q版萌趣', eng:'CHIBI', tagline:'亲切、灵动、表情丰富', image:'./assets/chibi.svg', bg:'#FEF3E9', tags:['人物','日常聊天']},
  {id:'line', name:'极简手绘', eng:'MINIMAL', tagline:'轻巧的线条，耐看的表情', image:'./assets/line.svg', bg:'#EDF9F5', tags:['手绘','清新']},
  {id:'clay', name:'软萌潮玩', eng:'SOFT 3D', tagline:'柔软立体，适合角色IP', image:'./assets/clay.svg', bg:'#F0EAFE', tags:['潮玩','IP角色']},
  {id:'pet', name:'宠物伙伴', eng:'PET CLUB', tagline:'留住毛孩子的日常神态', image:'./assets/pet.svg', bg:'#FFF2D8', tags:['宠物','陪伴']},
  {id:'brand', name:'品牌吉祥物', eng:'MASCOT', tagline:'企业沟通，更有识别度', image:'./assets/brand.svg', bg:'#E7F1FB', tags:['品牌','办公']},
  {id:'retro', name:'复古漫画', eng:'RETRO', tagline:'一点俏皮，一点复古感', image:'./assets/retro.svg', bg:'#F9E8E8', tags:['漫画','个性']},
];
export const EXPRESSIONS = [
  '你好','早安','晚安','谢谢','收到','好的','开心','大笑',
  '加油','点赞','抱抱','拜拜','哭哭','委屈','生气','无语',
  '惊讶','害羞','辛苦了','等等我','忙碌中','恭喜','想你','晚点聊'
];
export const STATUS = {
  'new':'待开始制作', 'making':'制作中', 'review':'等待客户确认',
  'revision':'修改中', 'done':'已完成'
};
export const PLATFORM = {wechat:'微信', line:'LINE', both:'微信 + LINE'};
export const DEFAULT_BOT_MESSAGES = [
  {role:'bot', text:'你好，我是表情研究所的体验版需求助理。这是预设回复演示，不是真实 AI。你可以告诉我想保留角色的哪些特征，或有什么特别的表情要求。'}
];
