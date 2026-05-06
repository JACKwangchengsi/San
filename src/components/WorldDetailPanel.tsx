// 世界详情面板 - 显示更真实的世界信息
import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { getShichen, getSeason, getReputationModifier } from '../systems/WorldSimulation';
import {
  calculateBodyCondition,
  getWeatherEffect,
  calculateMarketPrices,
  FACTIONS,
  getRelationType,
  getRelationDescription,
  getDetailedReputationEffect
} from '../systems/RealisticWorld';
import { Activity, Users, TrendingUp, Sword, CloudSun, Droplets, Thermometer, Wind, Coins, Star, MapPin, Skull, Bed, Zap } from 'lucide-react';

type TabType = 'body' | 'social' | 'market' | 'faction' | 'weather';

const WorldDetailPanel: React.FC = () => {
  const { state } = useGame();
  const [activeTab, setActiveTab] = useState<TabType>('body');
  
  const hour = new Date(state.world.time).getHours();
  const shichen = getShichen(hour);
  const month = new Date(state.world.time).getMonth();
  const season = getSeason(month);
  const bodyCondition = calculateBodyCondition(state);
  const weatherEffect = getWeatherEffect(state.world.weather.current, state.world.weather.temperature);
  const marketPrices = calculateMarketPrices(state);
  const reputation = getReputationModifier(state.player.jianghuFame, state.player.morality);
  const reputationDetail = getDetailedReputationEffect(state.player.jianghuFame, state.player.morality);
  
  const tabs: { id: TabType; label: string; Icon: React.ElementType }[] = [
    { id: 'body', label: '身体', Icon: Activity },
    { id: 'social', label: '人脉', Icon: Users },
    { id: 'market', label: '行情', Icon: TrendingUp },
    { id: 'faction', label: '势力', Icon: Sword },
    { id: 'weather', label: '天时', Icon: CloudSun }
  ];
  
  const aiSummary = state.lastAIResponseSummary;
  const isRecentAI = aiSummary && (Date.now() - aiSummary.timestamp < 120000); // 2分钟内

  return (
    <div className="flex flex-col bg-gray-900/50 rounded-lg">
      {/* AI→子系统联动：全局提示 */}
      {isRecentAI && (
        <div className="flex items-center gap-2 bg-amber-900/40 border-b border-amber-600/50 px-3 py-1.5 text-[11px] text-amber-300">
          <Zap size={12} className="text-amber-400 shrink-0" />
          <span className="truncate">
            AI联动：{[
              aiSummary.cultivationChanged && '修为',
              aiSummary.recipesUnlocked.length > 0 && '配方',
              aiSummary.factionChanges.length > 0 && '势力',
              aiSummary.injuryChangeCount > 0 && '伤势',
              aiSummary.relationChangedNpcNames.length > 0 && '人脉',
              aiSummary.economyChanged && '经济',
              aiSummary.bodyConditionChanged && '身体',
            ].filter(Boolean).join('·') || '数据已更新'}
          </span>
        </div>
      )}
      {/* 标签栏 */}
      <div className="flex border-b border-amber-900/30 bg-gray-800/50">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-2 py-2 text-xs transition-colors ${
              activeTab === tab.id
                ? 'bg-amber-900/40 text-amber-300 border-b-2 border-amber-500'
                : 'text-gray-400 hover:bg-gray-700/50'
            }`}
          >
            <span className="mr-1"><tab.Icon size={14} /></span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>
      
      {/* 内容区 */}
      <div className="p-3 text-sm">
        {/* 身体状态 */}
        {activeTab === 'body' && (
          <div className="space-y-4">
            <div className="text-center text-amber-400 font-medium mb-3">身体状况</div>
            
            {/* 体温 */}
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300"><Thermometer size={14} className="inline mr-1" />体温</span>
                <span className={`font-mono ${
                  bodyCondition.temperature > 37.5 ? 'text-red-400' :
                  bodyCondition.temperature < 36 ? 'text-blue-400' : 'text-green-400'
                }`}>
                  {bodyCondition.temperature}°C
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {bodyCondition.temperature > 38 ? '发热中，需要退热' :
                 bodyCondition.temperature > 37.5 ? '略有低烧' :
                 bodyCondition.temperature < 35.5 ? '体温过低，需要保暖' :
                 bodyCondition.temperature < 36 ? '有些发冷' : '体温正常'}
              </div>
            </div>
            
            {/* 状态条 */}
            <div className="space-y-2">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400"><Droplets size={14} className="inline mr-1" />失血</span>
                  <span className={bodyCondition.bloodLoss > 30 ? 'text-red-400' : 'text-gray-300'}>
                    {bodyCondition.bloodLoss.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-600 transition-all"
                    style={{ width: `${bodyCondition.bloodLoss}%` }}
                  />
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400"><Bed size={14} className="inline mr-1" />疲劳</span>
                  <span className={bodyCondition.fatigue > 50 ? 'text-orange-400' : 'text-gray-300'}>
                    {bodyCondition.fatigue.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-500 transition-all"
                    style={{ width: `${bodyCondition.fatigue}%` }}
                  />
                </div>
              </div>
              
              {bodyCondition.poison > 0 && (
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400"><Skull size={14} className="inline mr-1" />中毒</span>
                    <span className="text-purple-400">{bodyCondition.poison.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-600 transition-all"
                      style={{ width: `${bodyCondition.poison}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* 身体部位 */}
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-2">伤势状况</div>
              {state.player.injuries && state.player.injuries.length > 0 ? (
                <div className="space-y-1">
                  {state.player.injuries.map((injury, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-red-400">• {injury.bodyPart}: {injury.name}</span>
                      <span className="text-gray-500">{injury.severity}级</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-green-400">身体无恙</div>
              )}
            </div>
          </div>
        )}
        
        {/* 社会关系 */}
        {activeTab === 'social' && (
          <div className="space-y-4">
            <div className="text-center text-amber-400 font-medium mb-3">人脉关系</div>
            
            {/* 声望 */}
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300">🏆 江湖声望</span>
                <span className="text-amber-400">{reputation.description}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-gray-400">
                  名望值: <span className="text-white">{state.player.jianghuFame}</span>
                </div>
                <div className="text-gray-400">
                  侠义值: <span className="text-white">{state.player.morality}</span>
                </div>
              </div>
              <div className="mt-2 text-xs space-y-1">
                <div className="text-green-400">
                  • 商店折扣: {reputationDetail.shopDiscount}%
                </div>
                <div className="text-blue-400">
                  • 初始信任: +{reputationDetail.npcInitialTrust}
                </div>
              </div>
            </div>
            
            {/* NPC关系列表 */}
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-2">重要人物</div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {state.npcs.filter(n => n.status === 'alive').slice(0, 6).map(npc => {
                  const relType = getRelationType(npc);
                  const relDesc = getRelationDescription(relType);
                  return (
                    <div key={npc.id} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className={npc.gender === 'female' ? 'text-pink-400' : 'text-blue-400'}>
                          {npc.gender === 'female' ? '♀' : '♂'}
                        </span>
                        <span className="text-gray-300">{npc.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`${
                          relType === 'enemy' ? 'text-red-400' :
                          relType === 'close_friend' ? 'text-green-400' :
                          relType === 'friend' ? 'text-blue-400' : 'text-gray-400'
                        }`}>
                          {relDesc}
                        </span>
                        <span className="text-gray-500">({npc.relation})</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        {/* 市场行情 */}
        {activeTab === 'market' && (
          <div className="space-y-4">
            <div className="text-center text-amber-400 font-medium mb-3">市场行情</div>
            
            {/* 市场指数 */}
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300">📈 市场指数</span>
                <span className={`font-mono ${
                  state.world.currencySystem.marketIndex > 100 ? 'text-red-400' :
                  state.world.currencySystem.marketIndex < 100 ? 'text-green-400' : 'text-gray-300'
                }`}>
                  {state.world.currencySystem.marketIndex}%
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {state.world.currencySystem.marketIndex > 110 ? '物价飞涨，民不聊生' :
                 state.world.currencySystem.marketIndex > 100 ? '物价略高' :
                 state.world.currencySystem.marketIndex < 90 ? '物价低迷' : '物价平稳'}
              </div>
            </div>
            
            {/* 物价表 */}
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-2">当前物价</div>
              <div className="space-y-1">
                {marketPrices.map(price => (
                  <div key={price.itemType} className="flex justify-between text-xs">
                    <span className="text-gray-300">{price.itemType}</span>
                    <div className="flex items-center gap-2">
                      <span className={`${
                        price.trend === 'rising' ? 'text-red-400' :
                        price.trend === 'falling' ? 'text-green-400' : 'text-gray-400'
                      }`}>
                        {price.trend === 'rising' ? '↑' : price.trend === 'falling' ? '↓' : '→'}
                      </span>
                      <span className="text-amber-400">{price.currentPrice}文</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 盘缠 */}
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-2">💰 盘缠</div>
              <div className="flex justify-center gap-4 text-lg">
                <span className="text-yellow-400">
                  {state.player.currency.silver} <span className="text-xs">两</span>
                </span>
                <span className="text-amber-600">
                  {state.player.currency.copper} <span className="text-xs">文</span>
                </span>
              </div>
              <div className="text-center text-xs text-gray-500 mt-1">
                合计约 {(state.player.currency.silver * 100 + state.player.currency.copper)} 文
              </div>
            </div>
          </div>
        )}
        
        {/* 势力分布 */}
        {activeTab === 'faction' && (
          <div className="space-y-4">
            <div className="text-center text-amber-400 font-medium mb-3">江湖势力</div>
            
            <div className="space-y-2">
              {FACTIONS.map(faction => (
                <div key={faction.id} className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-medium ${
                      faction.attitude === 'hostile' ? 'text-red-400' :
                      faction.attitude === 'friendly' ? 'text-green-400' :
                      faction.attitude === 'allied' ? 'text-blue-400' : 'text-gray-300'
                    }`}>
                      {faction.name}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      faction.type === 'sect' ? 'bg-purple-900/50 text-purple-300' :
                      faction.type === 'gang' ? 'bg-blue-900/50 text-blue-300' :
                      faction.type === 'official' ? 'bg-yellow-900/50 text-yellow-300' :
                      faction.type === 'bandit' ? 'bg-red-900/50 text-red-300' :
                      'bg-gray-700 text-gray-300'
                    }`}>
                      {faction.type === 'sect' ? '门派' :
                       faction.type === 'gang' ? '帮派' :
                       faction.type === 'official' ? '官府' :
                       faction.type === 'bandit' ? '匪寨' : '商会'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">{faction.description}</div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">
                      势力: <span className="text-amber-400">{faction.influence}%</span>
                    </span>
                    <span className={`${
                      faction.attitude === 'hostile' ? 'text-red-400' :
                      faction.attitude === 'friendly' ? 'text-green-400' : 'text-gray-400'
                    }`}>
                      {faction.attitude === 'hostile' ? '敌对' :
                       faction.attitude === 'unfriendly' ? '不友好' :
                       faction.attitude === 'friendly' ? '友好' :
                       faction.attitude === 'allied' ? '同盟' : '中立'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 天时地利 */}
        {activeTab === 'weather' && (
          <div className="space-y-4">
            <div className="text-center text-amber-400 font-medium mb-3">天时地利</div>
            
            {/* 时辰 */}
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300">🕐 时辰</span>
                <span className="text-amber-400">{shichen.name}</span>
              </div>
              <div className="text-xs text-gray-500">{shichen.desc}</div>
              <div className="text-xs text-gray-400 mt-1">建议活动: {shichen.activity}</div>
            </div>
            
            {/* 季节 */}
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300">🍃 季节</span>
                <span className={`${
                  season.name === '春' ? 'text-green-400' :
                  season.name === '夏' ? 'text-red-400' :
                  season.name === '秋' ? 'text-yellow-400' : 'text-blue-400'
                }`}>
                  {season.name}季
                </span>
              </div>
              <div className="text-xs text-gray-500">
                温度范围: {season.tempRange[0]}°C ~ {season.tempRange[1]}°C
              </div>
            </div>
            
            {/* 天气 */}
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-300">🌤️ 天气</span>
                <span className="text-gray-100">
                  {state.world.weather.current === 'clear' ? '☀️ 晴' :
                   state.world.weather.current === 'cloudy' ? '☁️ 多云' :
                   state.world.weather.current === 'rain' ? '🌧️ 雨' :
                   state.world.weather.current === 'heavy_rain' ? '⛈️ 暴雨' :
                   state.world.weather.current === 'fog' ? '🌫️ 雾' :
                   state.world.weather.current === 'snow' ? '❄️ 雪' : '🌤️'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mt-2">
                <div>温度: <span className="text-white">{state.world.weather.temperature}°C</span></div>
                <div>湿度: <span className="text-white">{state.world.weather.humidity}%</span></div>
                <div>风速: <span className="text-white">{state.world.weather.windSpeed}m/s</span></div>
                <div>能见度: <span className="text-white">{state.world.weather.visibility}%</span></div>
              </div>
            </div>
            
            {/* 天气影响 */}
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-2">当前影响</div>
              <div className="text-xs text-gray-300">{weatherEffect.description}</div>
              <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
                <div className={weatherEffect.visibility < 0 ? 'text-red-400' : 'text-green-400'}>
                  能见度: {weatherEffect.visibility > 0 ? '+' : ''}{weatherEffect.visibility}%
                </div>
                <div className={weatherEffect.movement < 0 ? 'text-red-400' : 'text-green-400'}>
                  移动: {weatherEffect.movement > 0 ? '+' : ''}{weatherEffect.movement}%
                </div>
                <div className={weatherEffect.combat < 0 ? 'text-red-400' : 'text-green-400'}>
                  战斗: {weatherEffect.combat > 0 ? '+' : ''}{weatherEffect.combat}%
                </div>
                <div className={weatherEffect.mood < 0 ? 'text-red-400' : 'text-green-400'}>
                  心情: {weatherEffect.mood > 0 ? '+' : ''}{weatherEffect.mood}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorldDetailPanel;
