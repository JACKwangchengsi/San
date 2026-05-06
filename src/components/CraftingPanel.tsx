import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Hammer, ChevronRight, ChevronDown, AlertTriangle, Clock, Zap, Sword, Pill, Wrench, UtensilsCrossed, Shield } from 'lucide-react';
import SFX from '../utils/sfx';

interface Recipe {
  id: string;
  name: string;
  category: string;
  ingredients: { name: string; qty: number }[];
  result: { name: string; type: string; desc: string; qty: number; effects?: { stat: string; value: number }[]; weaponData?: { damage: number; range: number; accuracy: number; noiseLevel: number }; durability?: number };
  timeMinutes: number;
  skillRequired?: { skill: string; level: number };
  noiseLevel: number;
}

const RECIPES: Recipe[] = [
  // 武器
  { id:'r_nail_bat', name:'钉头棒', category:'武器', ingredients:[{name:'木棍',qty:1},{name:'铁钉',qty:1}], result:{name:'钉头棒',type:'weapon',desc:'钉满铁钉的木棒，近战利器',qty:1,weaponData:{damage:30,range:1.2,accuracy:65,noiseLevel:35},durability:80}, timeMinutes:15, noiseLevel:40 },
  { id:'r_spear', name:'简易长矛', category:'武器', ingredients:[{name:'木棍',qty:1},{name:'小刀',qty:1},{name:'麻绳',qty:1}], result:{name:'简易长矛',type:'weapon',desc:'绑着刀片的长矛，保持距离',qty:1,weaponData:{damage:25,range:2,accuracy:55,noiseLevel:20},durability:60}, timeMinutes:10, noiseLevel:20 },
  { id:'r_molotov', name:'火油瓶', category:'武器', ingredients:[{name:'酒瓶',qty:1},{name:'布条',qty:1},{name:'火油',qty:1}], result:{name:'火油瓶',type:'weapon',desc:'江湖常见的火攻器具',qty:1,weaponData:{damage:50,range:5,accuracy:40,noiseLevel:80}}, timeMinutes:5, noiseLevel:10 },
  { id:'r_shiv', name:'简易匕首', category:'武器', ingredients:[{name:'碎瓷片',qty:1},{name:'布条',qty:1}], result:{name:'简易匕首',type:'weapon',desc:'用碎瓷片制成的小刃',qty:1,weaponData:{damage:18,range:0.3,accuracy:80,noiseLevel:5},durability:30}, timeMinutes:5, noiseLevel:5 },
  // 医疗
  { id:'r_bandage_clean', name:'止血纱布', category:'医疗', ingredients:[{name:'绷带',qty:1},{name:'药酒',qty:1}], result:{name:'止血纱布',type:'medicine',desc:'消毒处理过的纱布',qty:1,effects:[{stat:'health',value:25}]}, timeMinutes:3, noiseLevel:0 },
  { id:'r_first_aid', name:'金疮药包', category:'医疗', ingredients:[{name:'绷带',qty:2},{name:'止痛散',qty:1},{name:'药酒',qty:1}], result:{name:'金疮药包',type:'medicine',desc:'常用金疮药包',qty:1,effects:[{stat:'health',value:50}]}, timeMinutes:5, noiseLevel:0 },
  { id:'r_splint', name:'简易夹板', category:'医疗', ingredients:[{name:'木棍',qty:2},{name:'布条',qty:2}], result:{name:'简易夹板',type:'medicine',desc:'固定筋骨用的夹板',qty:1,effects:[{stat:'health',value:15}]}, timeMinutes:8, noiseLevel:5 },
  // 工具
  { id:'r_torch', name:'简易火把', category:'工具', ingredients:[{name:'木棍',qty:1},{name:'布条',qty:1}], result:{name:'简易火把',type:'tool',desc:'可照明的火把，燃烧约30分钟',qty:1}, timeMinutes:3, noiseLevel:5 },
  { id:'r_water_filter', name:'竹滤水具', category:'工具', ingredients:[{name:'竹筒',qty:1},{name:'木炭',qty:1},{name:'布条',qty:1}], result:{name:'竹滤水具',type:'tool',desc:'可以过滤浑水',qty:1}, timeMinutes:15, noiseLevel:5 },
  { id:'r_alarm', name:'铃索警戒', category:'工具', ingredients:[{name:'铜铃',qty:3},{name:'麻绳',qty:1}], result:{name:'铃索警戒',type:'tool',desc:'绊线触发发出声响警告',qty:1}, timeMinutes:10, noiseLevel:15 },
  { id:'r_lockpick', name:'撬锁铁针', category:'工具', ingredients:[{name:'铁丝',qty:2}], result:{name:'撬锁铁针',type:'tool',desc:'可尝试撬开简单的锁',qty:1}, timeMinutes:8, noiseLevel:10, skillRequired:{skill:'crafting',level:2} },
  // 食物
  { id:'r_cooked_rice', name:'煮饭', category:'食物', ingredients:[{name:'大米',qty:1},{name:'清水囊',qty:1}], result:{name:'白米饭',type:'food',desc:'热腾腾的白米饭',qty:3,effects:[{stat:'hunger',value:35}]}, timeMinutes:30, noiseLevel:5 },
  { id:'r_purified_water', name:'净化水', category:'食物', ingredients:[{name:'浑水囊',qty:1},{name:'净水粉',qty:1}], result:{name:'清水囊',type:'drink',desc:'净化后的清水',qty:1,effects:[{stat:'thirst',value:30}]}, timeMinutes:2, noiseLevel:0 },
  { id:'r_boiled_water', name:'烧开水', category:'食物', ingredients:[{name:'浑水囊',qty:1}], result:{name:'热水囊',type:'drink',desc:'煮沸消毒过的水',qty:1,effects:[{stat:'thirst',value:25}]}, timeMinutes:10, noiseLevel:5 },
  // 防御
  { id:'r_barricade', name:'木栅障', category:'防御', ingredients:[{name:'木板',qty:3},{name:'铁钉',qty:5}], result:{name:'木栅障',type:'misc',desc:'可以封堵门窗的栅障',qty:1}, timeMinutes:20, noiseLevel:60 },
  { id:'r_bag', name:'布囊', category:'防御', ingredients:[{name:'布料',qty:3},{name:'麻绳',qty:1}], result:{name:'布囊',type:'container',desc:'手工缝制的布囊，增加负重',qty:1}, timeMinutes:25, noiseLevel:5 },
];

const CATEGORIES = ['全部','武器','医疗','工具','食物','防御'];

const CategoryIcon: React.FC<{ cat: string; size?: number }> = ({ cat, size = 13 }) => {
  switch (cat) {
    case '全部': return null;
    case '武器': return <Sword size={size} className="text-red-300" />;
    case '医疗': return <Pill size={size} className="text-emerald-300" />;
    case '工具': return <Wrench size={size} className="text-yellow-300" />;
    case '食物': return <UtensilsCrossed size={size} className="text-orange-300" />;
    case '防御': return <Shield size={size} className="text-slate-300" />;
    default: return null;
  }
};

const getRecipeIcon = (category: string) => {
  switch (category) {
    case '武器': return <Sword size={12} className="text-red-400" />;
    case '医疗': return <Pill size={12} className="text-emerald-400" />;
    case '工具': return <Wrench size={12} className="text-yellow-400" />;
    case '食物': return <UtensilsCrossed size={12} className="text-orange-400" />;
    case '防御': return <Shield size={12} className="text-slate-400" />;
    default: return null;
  }
};

export const CraftingPanel: React.FC = () => {
  const { state, dispatch, addLog } = useGame();
  const [selectedCat, setSelectedCat] = useState('全部');
  const [expandedRecipe, setExpandedRecipe] = useState<string|null>(null);
  const [crafting, setCrafting] = useState<string|null>(null);

  const inventory = state.player.inventory;

  const hasIngredient = (name: string, qty: number) => {
    const item = inventory.find(i => i.name === name);
    return item ? item.quantity >= qty : false;
  };

  const canCraft = (recipe: Recipe) => {
    return recipe.ingredients.every(ing => hasIngredient(ing.name, ing.qty));
  };

  const handleCraft = (recipe: Recipe) => {
    if (!canCraft(recipe) || crafting) return;
    if (state.settings.soundEnabled) SFX.craftItem();
    setCrafting(recipe.id);

    // Consume ingredients
    recipe.ingredients.forEach(ing => {
      const item = inventory.find(i => i.name === ing.name);
      if (item) {
        if (item.quantity > ing.qty) {
          dispatch({ type:'UPDATE_ITEM', payload:{ id:item.id, updates:{ quantity: item.quantity - ing.qty }}});
        } else {
          dispatch({ type:'REMOVE_ITEM', payload: item.id });
        }
      }
    });

    // Simulate crafting time
    setTimeout(() => {
      const r = recipe.result;
      dispatch({ type:'ADD_ITEM', payload:{
        id:`crafted_${Date.now()}`, name:r.name, description:r.desc,
        type:r.type as any, rarity:'uncommon', quantity:r.qty,
        maxStack:10, weight:0.3,
        isConsumable: ['food','drink','medicine'].includes(r.type),
        isReusable: !['food','drink','medicine'].includes(r.type),
        effects: r.effects as any, weaponData: r.weaponData as any,
        durability: r.durability, maxDurability: r.durability,
        createdAt:Date.now(), modifiedAt:Date.now()
      }});
      dispatch({ type:'ADVANCE_TIME', payload: recipe.timeMinutes });
      dispatch({ type:'UPDATE_PLAYER_STAT', payload:{ stat:'energy', value: -Math.ceil(recipe.timeMinutes/3) }});
      addLog(`🔨 制作完成：${r.name}${r.qty>1?` x${r.qty}`:''}（耗时${recipe.timeMinutes}分钟）`, 'discovery', 4);
      addLog(`📦 材料已消耗，物品已收入行囊；时间推进 ${recipe.timeMinutes} 分钟，内力与体力有所消耗。`, 'system', 2);
      if (recipe.noiseLevel > 30) {
        addLog(`⚠️ 制作过程发出了较大的动静（噪音: ${recipe.noiseLevel}），可能引来附近的歹人或野兽！`, 'warning', 3);
      }
      setCrafting(null);
    }, Math.min(recipe.timeMinutes * 100, 2000));
  };

  const filtered = selectedCat === '全部' ? RECIPES : RECIPES.filter(r => r.category === selectedCat);

  return (
    <div className="space-y-3">
      {/* AI→子系统联动：新配方标记 */}
      {(state.lastAIResponseSummary?.recipesUnlocked?.length ?? 0) > 0 && (
        <div className="flex items-center gap-2 bg-amber-900/40 border border-amber-600/50 rounded-lg px-3 py-2 text-xs text-amber-300 animate-pulse-slow">
          <Zap size={14} className="text-amber-400" />
          <span>AI剧情领悟新配方：{state.lastAIResponseSummary!.recipesUnlocked.join('、')}</span>
        </div>
      )}
      <div className="flex items-center gap-2 text-sm font-bold text-orange-400">
        <Hammer size={16}/> 制作系统
        <span className="text-[10px] text-zinc-500 font-normal">({RECIPES.length} 个配方)</span>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setSelectedCat(cat)}
            className={`px-2.5 py-1.5 rounded text-xs whitespace-nowrap transition flex items-center gap-1 ${selectedCat===cat?'bg-orange-600 text-white':'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
            <CategoryIcon cat={cat} size={12} /> {cat}
          </button>
        ))}
      </div>

      {/* Recipe list */}
      <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
        {filtered.map(recipe => {
          const craftable = canCraft(recipe);
          const isExpanded = expandedRecipe === recipe.id;
          const isCrafting = crafting === recipe.id;

          return (
            <div key={recipe.id} className={`rounded-lg border transition-all ${craftable ? 'bg-zinc-800/70 border-zinc-700 hover:border-orange-700' : 'bg-zinc-900/50 border-zinc-800 opacity-60'}`}>
              <div className="p-2.5 flex items-center justify-between cursor-pointer" onClick={() => setExpandedRecipe(isExpanded?null:recipe.id)}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="flex-shrink-0">{getRecipeIcon(recipe.category)}</span>
                  <div className="min-w-0">
                    <div className="text-sm text-white font-medium truncate">{recipe.name}</div>
                    <div className="text-[10px] text-zinc-500 flex items-center gap-2">
                      <span className="flex items-center gap-0.5"><Clock size={8}/>{recipe.timeMinutes}分</span>
                      {recipe.noiseLevel > 20 && <span className="flex items-center gap-0.5 text-orange-400">🔊{recipe.noiseLevel}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {craftable ? <span className="text-[10px] text-green-400 bg-green-900/30 px-1.5 py-0.5 rounded">可制作</span>
                    : <span className="text-[10px] text-red-400">缺少材料</span>}
                  {isExpanded ? <ChevronDown size={12} className="text-zinc-500"/> : <ChevronRight size={12} className="text-zinc-500"/>}
                </div>
              </div>

              {isExpanded && (
                <div className="px-2.5 pb-2.5 space-y-2 border-t border-zinc-700/50">
                  <p className="text-xs text-zinc-400 mt-2">{recipe.result.desc}</p>

                  {/* Ingredients */}
                  <div className="space-y-1">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">所需材料</div>
                    {recipe.ingredients.map((ing,i) => {
                      const has = hasIngredient(ing.name, ing.qty);
                      const owned = inventory.find(it => it.name === ing.name)?.quantity || 0;
                      return (
                        <div key={i} className={`flex items-center justify-between text-xs px-2 py-1 rounded ${has?'bg-green-900/20 text-green-300':'bg-red-900/20 text-red-300'}`}>
                          <span>{has?'✓':'✗'} {ing.name} x{ing.qty}</span>
                          <span className="text-zinc-500">拥有: {owned}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Result stats */}
                  {recipe.result.weaponData && (
                    <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                      <div className="bg-zinc-800 rounded p-1"><div className="text-red-400 font-bold">{recipe.result.weaponData.damage}</div><div className="text-zinc-500">伤害</div></div>
                      <div className="bg-zinc-800 rounded p-1"><div className="text-blue-400 font-bold">{recipe.result.weaponData.range}m</div><div className="text-zinc-500">范围</div></div>
                      <div className="bg-zinc-800 rounded p-1"><div className="text-green-400 font-bold">{recipe.result.weaponData.accuracy}%</div><div className="text-zinc-500">精准</div></div>
                      <div className="bg-zinc-800 rounded p-1"><div className="text-orange-400 font-bold">{recipe.result.weaponData.noiseLevel}</div><div className="text-zinc-500">噪音</div></div>
                    </div>
                  )}
                  {recipe.result.effects && (
                    <div className="flex gap-1">
                      {recipe.result.effects.map((e,i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 bg-green-900/30 text-green-300 rounded">{e.stat} +{e.value}</span>
                      ))}
                    </div>
                  )}

                  {recipe.noiseLevel > 30 && (
                    <div className="flex items-center gap-1 text-[10px] text-orange-400 bg-orange-900/20 px-2 py-1 rounded">
                      <AlertTriangle size={10}/> 动静大！可能引来歹人
                    </div>
                  )}

                  {recipe.skillRequired && (
                    <div className="flex items-center gap-1 text-[10px] text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded">
                      <Zap size={10}/> 需要 {recipe.skillRequired.skill} Lv.{recipe.skillRequired.level}
                    </div>
                  )}

                  <button onClick={() => handleCraft(recipe)} disabled={!craftable || !!crafting}
                    className={`w-full py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                      isCrafting ? 'bg-orange-800 text-orange-200 animate-pulse cursor-wait' :
                      craftable ? 'bg-orange-600 hover:bg-orange-500 text-white' :
                      'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    }`}>
                    {isCrafting ? (
                      <><span className="animate-spin-slow inline-block">⚙️</span> 制作中...</>
                    ) : (
                      <><Hammer size={14}/> 制作 ({recipe.timeMinutes}分钟)</>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-xs text-zinc-600 border-t border-zinc-800 pt-3 space-y-1">
        <p className="flex items-center gap-1"><Hammer size={10} className="text-orange-400" /> 制作需要对应材料和时间</p>
        <p className="flex items-center gap-1"><AlertTriangle size={10} className="text-amber-400" /> 大动静可能引来歹人或野兽</p>
        <p className="flex items-center gap-1"><Zap size={10} className="text-cyan-400" /> 制作消耗内力与体力</p>
      </div>
    </div>
  );
};
