import React, { useMemo, useState } from 'react';
import { useGame } from '../context/GameContext';
import { User, Utensils, Coffee, Home, Coins, Hammer, MapPin, MessageSquare, Store, Ship, Bed, Building2, Wine, AlertCircle, Zap } from 'lucide-react';
import SFX from '../utils/sfx';

interface ShopPanelProps {
  isMobile?: boolean;
}

const shopNPCs: Record<string, { name: string; title: string; greeting: string; Icon: React.ElementType; hours: string; mood: string }> = {
  '青石驿': { name: '刘驿丞', title: '驿站管事', greeting: '这位少侠，可要歇脚、吃饭，还是问路？', Icon: Store, hours: '全天轮值', mood: '老成、谨慎' },
  '柳影茶肆': { name: '柳娘子', title: '茶肆老板娘', greeting: '茶已温好，消息也有，客官慢慢挑。', Icon: Coffee, hours: '卯时至戌时', mood: '精明、风情' },
  '云岫镇': { name: '张老板', title: '杂货铺掌柜', greeting: '做买卖讲究一个实在，您瞧好再谈价。', Icon: Building2, hours: '辰时至酉时', mood: '圆滑、势利' },
  '云岫镇集市': { name: '李货郎', title: '走商', greeting: '南货北货都有，手快有手慢无。', Icon: Ship, hours: '辰时至申时', mood: '健谈、机灵' },
  '渡口': { name: '老船夫', title: '摆渡人', greeting: '想过河，先看天色，再看银钱。', Icon: Ship, hours: '卯时至酉时', mood: '沉默、老辣' },
};

/** 根据 AI 动态生成的地点名，自动推断店铺 NPC */
function inferShopNPC(locationName: string, locationType?: string): { name: string; title: string; greeting: string; Icon: React.ElementType; hours: string; mood: string } {
  // 已有硬编码优先
  if (shopNPCs[locationName]) return shopNPCs[locationName];

  const seed = locationName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const surnames = ['王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '孙', '马', '胡', '郭', '林', '何', '高', '罗', '郑', '梁'];
  const surname = surnames[seed % surnames.length];
  
  const isInn = /驿|客栈|旅|店/.test(locationName);
  const isTea = /茶|楼|馆/.test(locationName);
  const isMarket = /集|市|铺|街|坊/.test(locationName);
  const isPort = /渡|码头|船/.test(locationName);
  const isTown = /镇|城|村|庄|寨/.test(locationName);
  const isBuilding = locationType === 'building';

  if (isInn) return { name: `${surname}掌柜`, title: '店家', greeting: '客官打尖还是住店？歇脚、吃饭、听消息都成。', Icon: Store, hours: '全天轮值', mood: '老练、周到' };
  if (isTea) return { name: `${surname}娘子`, title: '茶楼主人', greeting: '茶已备好，客官请坐，慢慢品。', Icon: Coffee, hours: '卯时至戌时', mood: '精明、亲切' };
  if (isMarket) return { name: `${surname}货郎`, title: '行商', greeting: '好货不等人，客官随便瞧瞧。', Icon: Ship, hours: '辰时至申时', mood: '健谈、机灵' };
  if (isPort) return { name: `${surname}老伯`, title: '摆渡人', greeting: '水路有风险，客官可要想清楚。', Icon: Ship, hours: '卯时至酉时', mood: '沉默、老辣' };
  if (isTown || isBuilding) return { name: `${surname}老板`, title: '商铺主人', greeting: '小本经营，客官多担待。', Icon: Building2, hours: '辰时至酉时', mood: '圆滑、谨慎' };
  return { name: '店小二', title: '伙计', greeting: '客官有何吩咐？小的在这帮您看着。', Icon: User, hours: '不定', mood: '普通' };
}

const ShopPanel: React.FC<ShopPanelProps> = ({ isMobile }) => {
  const { state, stayAtInn, buyFood, drinkTea, sellItem, earnMoney, addLog, dispatch } = useGame();
  const soundEnabled = state.settings.soundEnabled;
  const [activeTab, setActiveTab] = useState<'npc' | 'inn' | 'food' | 'tea' | 'sell' | 'work'>('npc');
  const [showNPCDialog, setShowNPCDialog] = useState(false);

  const location = state.locations.find(l => l.name === state.world.location);
  const currentShopNPC = inferShopNPC(state.world.location, location?.type);
  const locName = location?.name || state.world.location;

  const hour = new Date(state.world.time).getHours();
  const timeLabel = hour >= 5 && hour < 7 ? '卯时' : hour < 9 ? '辰时' : hour < 11 ? '巳时' : hour < 13 ? '午时' : hour < 15 ? '未时' : hour < 17 ? '申时' : hour < 19 ? '酉时' : hour < 21 ? '戌时' : hour < 23 ? '亥时' : '子时';

  // 动态判断：有店铺特征的场所都可营业
  const isInn = /驿|客栈|旅店|客舍/.test(locName);
  const isTeahouse = /茶|楼|馆|肆|亭/.test(locName);
  const isMarket = /集市|市场|铺|街|坊|镇|城/.test(locName);
  const canWork = /集市|镇|驿|渡口|码头|城|村|庄/.test(locName);
  const hasShop = isInn || isTeahouse || isMarket || canWork;

  const totalMoney = state.player.currency.silver * 100 + state.player.currency.copper;
  const fameRate = state.player.jianghuFame >= 80 ? 0.85 : state.player.jianghuFame >= 50 ? 0.92 : state.player.jianghuFame >= 20 ? 0.96 : 1;
  const marketRate = Math.max(0.8, Math.min(1.35, state.world.currencySystem.marketIndex / 100));
  const finalRate = fameRate * marketRate;

  const foodItems = [
    { name: '馒头', price: 3, desc: '热腾腾的白面馒头', Icon: Utensils, hunger: 15, energy: 5 },
    { name: '包子', price: 5, desc: '肉馅包子，香气扑鼻', Icon: Utensils, hunger: 20, energy: 8 },
    { name: '面条', price: 8, desc: '一碗热汤面', Icon: Utensils, hunger: 25, energy: 10 },
    { name: '烧鸡', price: 25, desc: '酥香烧鸡', Icon: Utensils, hunger: 40, energy: 20 },
    { name: '酒菜', price: 50, desc: '一壶酒，两碟小菜', Icon: Wine, hunger: 35, energy: 15 },
    { name: '素斋', price: 15, desc: '清淡素斋', Icon: Utensils, hunger: 22, energy: 12 },
    { name: '干粮', price: 10, desc: '便于携带的干粮饼', Icon: Utensils, hunger: 18, energy: 5 },
    { name: '肉干', price: 20, desc: '熏制肉干', Icon: Utensils, hunger: 28, energy: 15 }
  ];

  const teaItems = [
    { name: '粗茶', price: 2, desc: '普通粗茶，解渴而已', Icon: Coffee, thirst: 20, sanity: 3 },
    { name: '清茶', price: 8, desc: '清香淡雅的绿茶', Icon: Coffee, thirst: 25, sanity: 8 },
    { name: '龙井', price: 30, desc: '上好龙井，香气四溢', Icon: Coffee, thirst: 30, sanity: 15 },
    { name: '药茶', price: 20, desc: '加了草药的茶，略带苦涩', Icon: Coffee, thirst: 15, sanity: 5 },
    { name: '酒', price: 15, desc: '一壶浊酒', Icon: Wine, thirst: 10, sanity: -5 },
    { name: '好酒', price: 40, desc: '陈年佳酿', Icon: Wine, thirst: 15, sanity: -3 }
  ];

  const innOptions = [
    { type: 'basic' as const, name: '通铺', price: 30, desc: '大通间，人声嘈杂', Icon: Bed, energy: 40, sanity: 10 },
    { type: 'standard' as const, name: '客房', price: 80, desc: '单间客房，尚算清净', Icon: Home, energy: 60, sanity: 20 },
    { type: 'luxury' as const, name: '雅间', price: 200, desc: '上等雅间，锦被软枕', Icon: Building2, energy: 80, sanity: 35 }
  ];

  const workOptions = [
    { name: '搬货', pay: 15, time: 60, energy: 20, desc: '帮商贩搬运货物', stamina: 25 },
    { name: '跑腿', pay: 8, time: 30, energy: 10, desc: '替人传递消息', stamina: 15 },
    { name: '护卫', pay: 30, time: 120, energy: 15, desc: '充当临时护卫', stamina: 20, combat: true },
    { name: '卖艺', pay: 20, time: 60, energy: 12, desc: '展示拳脚或剑招赚赏钱', stamina: 15, fame: true },
    { name: '抄书', pay: 12, time: 90, energy: 8, desc: '替人抄写文书', stamina: 10 }
  ];

  const visibleWorkOptions = useMemo(() => {
    if (state.player.sect && state.player.jianghuFame > 30) return workOptions;
    return workOptions.filter(w => w.name !== '护卫');
  }, [state.player.sect, state.player.jianghuFame]);

  const handleWork = (work: typeof workOptions[0]) => {
    if (state.player.stats.energy.value < work.energy) {
      addLog('你太累了，需要先休息。', 'warning', 3);
      return;
    }
    if (state.player.stats.stamina.value < work.stamina) {
      addLog('体力不足，无法完成这项工作。', 'warning', 3);
      return;
    }
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'energy', value: -work.energy } });
    dispatch({ type: 'UPDATE_PLAYER_STAT', payload: { stat: 'stamina', value: -work.stamina } });
    dispatch({ type: 'ADVANCE_TIME', payload: work.time });
    earnMoney(0, work.pay, work.name);
    if (work.fame) {
      dispatch({ type: 'UPDATE_PLAYER', payload: { jianghuFame: state.player.jianghuFame + 1 } });
    }
    addLog(`你花了${work.time}分钟${work.desc}，赚了${work.pay}文钱。${work.fame ? '围观的人渐渐多了些，你的名头也开始被人记住。' : ''}`, 'narrative', 2);
  };

  const handleNPCInteract = (action: string) => {
    setShowNPCDialog(false);
    switch(action) {
      case 'food':
        setActiveTab('food');
        addLog(`${currentShopNPC.name}微微一笑："客官想吃些什么？咸的甜的、热的冷的，都有。"`, 'dialogue', 2);
        break;
      case 'tea':
        setActiveTab('tea');
        addLog(`${currentShopNPC.name}抬手一引："茶盏已经温过了，客官请坐。"`, 'dialogue', 2);
        break;
      case 'inn':
        setActiveTab('inn');
        addLog(`${currentShopNPC.name}看了你一眼："住店要先付银钱，夜里还得守规矩。"`, 'dialogue', 2);
        break;
      case 'sell':
        setActiveTab('sell');
        addLog(`${currentShopNPC.name}掂量了一下你的包裹："卖货可以，成色和来路都得说清。"`, 'dialogue', 2);
        break;
      case 'work':
        setActiveTab('work');
        addLog(`${currentShopNPC.name}想了想："倒有几样活计，就看你肯不肯吃苦。"`, 'dialogue', 2);
        break;
      case 'info':
        addLog(`${currentShopNPC.name}压低声音道："近来江湖不太平，镇外路上常有歹人踩点。若你真要往黑水峡去，白天也别走偏路。"`, 'dialogue', 3);
        break;
      case 'gossip': {
        const gossips = [
          '听说云岫镇来了个神秘剑客，一剑伤了三名地痞。',
          '最近官府在查旧案，牵扯到十年前某个门派血案。',
          '渡口那老船夫据说年轻时也是走江湖的狠角色。',
          '医馆的孙大夫医术极稳，就是不轻易接危险病人。',
          '近来山里野兽多了，采药人已经不敢独自进山。'
        ];
        addLog(`${currentShopNPC.name}凑近了些："${gossips[Math.floor(Math.random() * gossips.length)]}"`, 'dialogue', 2);
        break;
      }
    }
  };

  const sellableItems = state.player.inventory.filter(item => !item.name.includes('银') && !item.name.includes('铜钱') && !item.name.includes('钱袋'));

  if (!hasShop) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <div className="text-4xl mb-4"><Home size={48} className="text-zinc-600" /></div>
        <h3 className="text-lg text-gray-400 mb-2">此处没有店铺</h3>
        <p className="text-sm text-gray-500">前往驿站、茶肆、集市或城镇才能进行交易和歇脚。</p>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col bg-gray-900 ${isMobile ? 'text-sm' : ''}`}>
      <div className="p-3 bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border-b border-yellow-700/50 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-yellow-300 font-bold flex items-center gap-1"><Coins size={14} />盘缠</span>
          <div className="flex gap-4 text-sm">
            <span className="text-yellow-200 flex items-center gap-0.5"><Coins size={12} />{state.player.currency.silver} 两</span>
            <span className="text-orange-300 flex items-center gap-0.5"><Coins size={12} />{state.player.currency.copper} 文</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] text-zinc-400">
          <span>当前时辰：{timeLabel}</span>
          <span>市价指数：{state.world.currencySystem.marketIndex} · 名望影响：{Math.round((1 - fameRate) * 100)}%</span>
        </div>
      </div>

      <div className="p-3 bg-gradient-to-r from-amber-900/20 to-yellow-900/20 border-b border-amber-700/30 cursor-pointer hover:bg-amber-900/30 transition-colors" onClick={() => setShowNPCDialog(true)}>
        <div className="flex items-center gap-3">
          <div className="text-3xl"><currentShopNPC.Icon size={32} /></div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-bold">{currentShopNPC.name}</span>
              <span className="text-xs text-amber-400 bg-amber-900/50 px-2 py-0.5 rounded">{currentShopNPC.title}</span>
              <span className="text-xs text-zinc-500">营业：{currentShopNPC.hours}</span>
            </div>
            <p className="text-sm text-gray-400 mt-1">"{currentShopNPC.greeting}"</p>
          </div>
          <div className="text-amber-400 flex items-center gap-1"><MessageSquare size={14} />交谈</div>
        </div>
      </div>

      {showNPCDialog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowNPCDialog(false)}>
          <div className="bg-gray-900 border border-amber-700/50 rounded-xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-700 flex items-center gap-3">
              <div className="text-4xl"><currentShopNPC.Icon size={36} /></div>
              <div>
                <h3 className="text-lg font-bold text-white">{currentShopNPC.name}</h3>
                <p className="text-sm text-amber-400">{currentShopNPC.title}</p>
                <p className="text-[10px] text-zinc-500">性情：{currentShopNPC.mood}</p>
              </div>
            </div>

            <div className="p-4">
              <p className="text-gray-300 mb-4">"{currentShopNPC.greeting}"</p>
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-2">你想要做什么？</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleNPCInteract('food')} className="p-3 bg-gray-800 hover:bg-amber-900/50 border border-gray-700 hover:border-amber-600 rounded-lg text-left transition-colors">
                    <div className="text-xl mb-1"><Utensils size={20} /></div><div className="text-white font-medium">买吃食</div><div className="text-xs text-gray-400">填饱肚子</div>
                  </button>
                  {isTeahouse && <button onClick={() => handleNPCInteract('tea')} className="p-3 bg-gray-800 hover:bg-amber-900/50 border border-gray-700 hover:border-amber-600 rounded-lg text-left transition-colors"><div className="text-xl mb-1"><Coffee size={20} /></div><div className="text-white font-medium">喝茶酒</div><div className="text-xs text-gray-400">解渴宁神</div></button>}
                  {isInn && <button onClick={() => handleNPCInteract('inn')} className="p-3 bg-gray-800 hover:bg-amber-900/50 border border-gray-700 hover:border-amber-600 rounded-lg text-left transition-colors"><div className="text-xl mb-1"><Home size={20} /></div><div className="text-white font-medium">住店</div><div className="text-xs text-gray-400">恢复精力</div></button>}
                  {isMarket && <button onClick={() => handleNPCInteract('sell')} className="p-3 bg-gray-800 hover:bg-amber-900/50 border border-gray-700 hover:border-amber-600 rounded-lg text-left transition-colors"><div className="text-xl mb-1"><Coins size={20} /></div><div className="text-white font-medium">卖东西</div><div className="text-xs text-gray-400">换取银钱</div></button>}
                  {canWork && <button onClick={() => handleNPCInteract('work')} className="p-3 bg-gray-800 hover:bg-amber-900/50 border border-gray-700 hover:border-amber-600 rounded-lg text-left transition-colors"><div className="text-xl mb-1"><Hammer size={20} /></div><div className="text-white font-medium">找活干</div><div className="text-xs text-gray-400">赚取盘缠</div></button>}
                  <button onClick={() => handleNPCInteract('info')} className="p-3 bg-gray-800 hover:bg-blue-900/50 border border-gray-700 hover:border-blue-600 rounded-lg text-left transition-colors"><div className="text-xl mb-1"><MapPin size={20} /></div><div className="text-white font-medium">打听消息</div><div className="text-xs text-gray-400">周边情况</div></button>
                  <button onClick={() => handleNPCInteract('gossip')} className="p-3 bg-gray-800 hover:bg-purple-900/50 border border-gray-700 hover:border-purple-600 rounded-lg text-left transition-colors"><div className="text-xl mb-1"><MessageSquare size={20} /></div><div className="text-white font-medium">江湖传闻</div><div className="text-xs text-gray-400">坊间流言</div></button>
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-gray-700">
              <button onClick={() => setShowNPCDialog(false)} className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">离开</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex border-b border-gray-700 bg-gray-800/50 overflow-x-auto">
        {([
          { key: 'npc', label: '掌柜', Icon: User, show: true },
          { key: 'food', label: '吃食', Icon: Utensils, show: true },
          { key: 'tea', label: '茶酒', Icon: Coffee, show: isTeahouse },
          { key: 'inn', label: '住店', Icon: Home, show: isInn },
          { key: 'sell', label: '卖物', Icon: Coins, show: isMarket },
          { key: 'work', label: '活计', Icon: Hammer, show: canWork }
        ] as const).filter(t => t.show).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={`flex-1 py-2 px-2 text-xs transition-colors whitespace-nowrap ${activeTab === tab.key ? 'bg-amber-900/50 text-yellow-300 border-b-2 border-yellow-500' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}>
            <tab.Icon size={13} className={isMobile ? '' : 'mr-1 inline'} />
            {!isMobile && <span>{tab.label}</span>}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {activeTab === 'npc' && (
          <div className="space-y-3">
            <div className="rounded-lg bg-zinc-800/50 border border-zinc-700 p-3">
              <div className="text-sm text-white font-medium mb-1">{currentShopNPC.name} · {currentShopNPC.title}</div>
              <div className="text-xs text-zinc-400 leading-relaxed">
                营业时段：{currentShopNPC.hours}。此人{currentShopNPC.mood}，在本地小有门路，既能卖货，也能告诉你一些不便写在告示上的消息。
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded bg-zinc-800/40 p-2 border border-zinc-700">
                <div className="text-zinc-500">当前行情</div>
                <div className="text-amber-300 font-medium">市价指数 {state.world.currencySystem.marketIndex}</div>
              </div>
              <div className="rounded bg-zinc-800/40 p-2 border border-zinc-700">
                <div className="text-zinc-500">你的名望折扣</div>
                <div className="text-green-300 font-medium">{Math.round((1 - fameRate) * 100)}%</div>
              </div>
            </div>
            {/* AI 经济变更高亮 */}
            {(() => {
              const s = state.lastAIResponseSummary;
              if (!s || !s.economyChanged || Date.now() - s.timestamp > 120000) return null;
              return (
                <div className="mt-2 rounded bg-yellow-900/25 border border-yellow-700/50 p-2 flex items-center gap-1.5 animate-pulse-slow">
                  <Zap size={12} className="text-yellow-400 shrink-0" />
                  <span className="text-[10px] text-yellow-300">AI 经济联动：市价或税率最近有变动</span>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'food' && (
          <div className="space-y-2">
            <p className="text-gray-400 text-xs mb-2">※ 价格受市价与名望影响，夜里能买到的吃食更少。</p>
            {foodItems.map(item => {
              const finalPrice = Math.max(1, Math.ceil(item.price * finalRate));
              return (
                <div key={item.name} className={`flex items-center justify-between p-2 rounded bg-gray-800/50 border border-gray-700 hover:border-amber-600/50 transition-colors ${totalMoney < finalPrice ? 'opacity-50' : 'cursor-pointer'}`} onClick={() => { if (totalMoney >= finalPrice) { if (soundEnabled) SFX.buyItem(); buyFood(item.name); } }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl"><item.Icon size={22} /></span>
                    <div>
                      <div className="text-white font-medium">{item.name}</div>
                      <div className="text-gray-400 text-xs">{item.desc}</div>
                      <div className="text-green-400 text-xs">饱腹+{item.hunger} 精力+{item.energy}</div>
                    </div>
                  </div>
                  <div className="text-yellow-400 font-bold">{finalPrice}文</div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'tea' && (
          <div className="space-y-2">
            <p className="text-gray-400 text-xs mb-2">※ 茶能安神，酒能暖身，但也可能误事。</p>
            {teaItems.map(item => {
              const finalPrice = Math.max(1, Math.ceil(item.price * finalRate));
              return (
                <div key={item.name} className={`flex items-center justify-between p-2 rounded bg-gray-800/50 border border-gray-700 hover:border-amber-600/50 transition-colors ${totalMoney < finalPrice ? 'opacity-50' : 'cursor-pointer'}`} onClick={() => { if (totalMoney >= finalPrice) { if (soundEnabled) SFX.buyItem(); drinkTea(item.name); } }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl"><item.Icon size={22} /></span>
                    <div>
                      <div className="text-white font-medium">{item.name}</div>
                      <div className="text-gray-400 text-xs">{item.desc}</div>
                      <div className="text-blue-400 text-xs">解渴+{item.thirst} 心境{item.sanity > 0 ? '+' : ''}{item.sanity}</div>
                    </div>
                  </div>
                  <div className="text-yellow-400 font-bold">{finalPrice}文</div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'inn' && (
          <div className="space-y-2">
            <p className="text-gray-400 text-xs mb-2">※ 夜间住店更合理，白日住上房有时会被掌柜婉拒。</p>
            {innOptions.map(inn => {
              const finalPrice = Math.max(1, Math.ceil(inn.price * finalRate));
              return (
                <div key={inn.type} className={`flex items-center justify-between p-3 rounded bg-gray-800/50 border border-gray-700 hover:border-amber-600/50 transition-colors ${totalMoney < finalPrice ? 'opacity-50' : 'cursor-pointer'}`} onClick={() => { if (totalMoney >= finalPrice) { if (soundEnabled) SFX.click(); stayAtInn(inn.type); } }}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl"><inn.Icon size={24} /></span>
                    <div>
                      <div className="text-white font-medium">{inn.name}</div>
                      <div className="text-gray-400 text-xs">{inn.desc}</div>
                      <div className="text-green-400 text-xs">精力+{inn.energy} 心境+{inn.sanity}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-yellow-400 font-bold">{finalPrice >= 100 ? `${Math.floor(finalPrice/100)}两${finalPrice%100 > 0 ? `${finalPrice%100}文` : ''}` : `${finalPrice}文`}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'sell' && (
          <div className="space-y-2">
            <p className="text-gray-400 text-xs mb-2">※ 商贩会看成色、来路和时辰。夜里通常不收货。</p>
            {sellableItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">没有可出售的物品</div>
            ) : (
              sellableItems.map(item => {
                const basePrice: Record<string, number> = { weapon: 50, medicine: 15, food: 5, drink: 3, tool: 20, material: 10, clothing: 25, document: 30, misc: 5, container: 8, device: 5, ammo: 1, key: 2, consumable: 5 };
                const rarityMultiplier: Record<string, number> = { common: 1, uncommon: 2, rare: 4, epic: 8, legendary: 20 };
                let price = (basePrice[item.type] || 5) * (rarityMultiplier[item.rarity] || 1);
                price = Math.floor(price * item.quantity * (item.durability ? item.durability / 100 : 1) * (state.world.currencySystem.marketIndex / 100));
                return (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded bg-gray-800/50 border border-gray-700 hover:border-red-600/50 cursor-pointer transition-colors" onClick={() => { if (soundEnabled) SFX.sellItem(); sellItem(item.id); }}>
                    <div>
                      <div className="text-white font-medium">{item.name} {item.quantity > 1 && <span className="text-gray-400">×{item.quantity}</span>}</div>
                      <div className="text-gray-400 text-xs">{item.description || item.type}</div>
                    </div>
                    <div className="text-green-400 font-bold">+{price >= 100 ? `${Math.floor(price/100)}两${price%100}文` : `${price}文`}</div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'work' && (
          <div className="space-y-2">
            <p className="text-gray-400 text-xs mb-2">※ 活计受身份与名望影响，越体面或危险的活，要求越高。</p>
            {visibleWorkOptions.map(work => (
              <div key={work.name} className={`flex items-center justify-between p-2 rounded bg-gray-800/50 border border-gray-700 hover:border-green-600/50 transition-colors ${state.player.stats.energy.value < work.energy || state.player.stats.stamina.value < work.stamina ? 'opacity-50' : 'cursor-pointer'}`} onClick={() => { if (state.player.stats.energy.value >= work.energy && state.player.stats.stamina.value >= work.stamina) { if (soundEnabled) SFX.click(); handleWork(work); } }}>
                <div>
                  <div className="text-white font-medium">{work.name}</div>
                  <div className="text-gray-400 text-xs">{work.desc} · {work.time}分钟</div>
                  <div className="text-red-400 text-xs">消耗精力{work.energy} 体力{work.stamina}</div>
                </div>
                <div className="text-green-400 font-bold">+{work.pay}文</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-2 border-t border-gray-700 bg-gray-800/30">
        <div className="text-center text-xs text-gray-500">📍 当前位置：{state.world.location}</div>
      </div>
    </div>
  );
};

export default ShopPanel;
