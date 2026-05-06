import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { PlayerState, WorldState } from '../types/game';
import { format } from 'date-fns';
import {
  Heart, Droplets, Utensils, Zap, Brain,
  MapPin, Calendar, Thermometer, Wind,
  Activity, Shield, Biohazard, HardHat, Swords,
  Gem, Briefcase, Footprints, Layers, User
} from 'lucide-react';
import { loadPlayerPortrait, type PlayerPortraitInfo } from '../utils/portraitStorage';

interface StatsPanelProps {
  player: PlayerState;
  world: WorldState;
}

interface StatBarProps {
  label: string;
  value: number;
  max: number;
  icon: React.ElementType;
  color: string;
  showWarning?: boolean;
  criticalThreshold?: number;
}

const StatBar: React.FC<StatBarProps> = ({ 
  label, value, max, icon: Icon, color, showWarning = true, criticalThreshold = 20 
}) => {
  const percentage = (value / max) * 100;
  const isCritical = value <= criticalThreshold;
  const isLow = value <= criticalThreshold * 1.5 && !isCritical;
  
  return (
    <div className="mb-3 group">
      <div className="flex items-center gap-2 text-zinc-300 mb-1">
        <Icon size={14} className={`transition-all ${
          isCritical && showWarning ? 'text-red-500 animate-pulse' : 
          isLow && showWarning ? 'text-orange-400' : color
        }`} />
        <div className="flex-1 flex justify-between text-xs">
          <span className={`transition-colors ${
            isCritical && showWarning ? 'text-red-400 font-medium' : 
            isLow && showWarning ? 'text-orange-300' : ''
          }`}>{label}</span>
          <span className={`transition-colors ${
            isCritical && showWarning ? 'text-red-400 font-bold animate-pulse' : 
            isLow && showWarning ? 'text-orange-400 font-medium' : 'text-zinc-500'
          }`}>
            {Math.round(value)}/{max}
          </span>
        </div>
      </div>
      <div className={`h-2 w-full bg-zinc-800 rounded-full overflow-hidden transition-all ${
        isCritical && showWarning ? 'shadow-[0_0_8px_rgba(239,68,68,0.5)]' : ''
      }`}>
        <div 
          className={`h-full transition-all duration-500 ease-out ${
            isCritical && showWarning ? 'bg-gradient-to-r from-red-700 to-red-500 animate-pulse' : 
            isLow && showWarning ? 'bg-gradient-to-r from-orange-600 to-orange-400' :
            `${color.replace('text-', 'bg-')} bg-gradient-to-r`
          }`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
      {/* 悬停时显示详细信息 */}
      {isCritical && showWarning && (
        <div className="text-[10px] text-red-400 mt-0.5 animate-fade-in">
          ⚠️ 危险！需要立即补充
        </div>
      )}
    </div>
  );
};

const getWeatherIcon = (weather: string) => {
  const icons: Record<string, string> = {
    'clear': '☀️',
    'cloudy': '⛅',
    'overcast': '☁️',
    'drizzle': '🌧️',
    'rain': '🌧️',
    'heavy_rain': '⛈️',
    'thunderstorm': '⛈️',
    'fog': '🌫️',
    'snow': '❄️',
    'blizzard': '🌨️'
  };
  return icons[weather] || '🌤️';
};

const getWeatherLabel = (weather: string) => {
  const labels: Record<string, string> = {
    'clear': '晴朗',
    'cloudy': '多云',
    'overcast': '阴天',
    'drizzle': '细雨',
    'rain': '雨天',
    'heavy_rain': '暴雨',
    'thunderstorm': '雷雨',
    'fog': '浓雾',
    'snow': '小雪',
    'blizzard': '风雪'
  };
  return labels[weather] || weather;
};

const getTimeOfDayLabel = (time: string) => {
  const labels: Record<string, string> = {
    'dawn': '卯时',
    'morning': '辰时',
    'noon': '午时',
    'afternoon': '申时',
    'dusk': '酉时',
    'evening': '戌时',
    'night': '亥时',
    'midnight': '子时'
  };
  return labels[time] || time;
};

// 僵尸毁灭工程风格的Moodles系统
interface Moodle {
  id: string;
  icon: string;
  label: string;
  level: number; // 0=无, 1=轻微, 2=中等, 3=严重, 4=极度
  color: string;
  description: string;
}

const getMoodles = (player: PlayerState, world: WorldState): Moodle[] => {
  const m: Moodle[] = [];
  const s = player.stats;
  // 饥饿
  if (s.hunger.value < 80) {
    const lvl = s.hunger.value < 10 ? 4 : s.hunger.value < 25 ? 3 : s.hunger.value < 50 ? 2 : 1;
    m.push({ id:'hungry', icon:'🍖', label:['微饿','饥饿','很饿','饿死了'][lvl-1], level:lvl, color:['text-yellow-300','text-orange-400','text-orange-500','text-red-500'][lvl-1], description:`饥饿度 ${Math.round(s.hunger.value)}%` });
  }
  // 口渴
  if (s.thirst.value < 80) {
    const lvl = s.thirst.value < 10 ? 4 : s.thirst.value < 25 ? 3 : s.thirst.value < 50 ? 2 : 1;
    m.push({ id:'thirsty', icon:'💧', label:['微渴','口渴','很渴','脱水'][lvl-1], level:lvl, color:['text-blue-300','text-blue-400','text-blue-500','text-red-500'][lvl-1], description:`口渴度 ${Math.round(s.thirst.value)}%` });
  }
  // 疲劳
  if (s.energy.value < 70) {
    const lvl = s.energy.value < 10 ? 4 : s.energy.value < 25 ? 3 : s.energy.value < 45 ? 2 : 1;
    m.push({ id:'tired', icon:'😴', label:['困倦','疲惫','精疲力竭','虚脱'][lvl-1], level:lvl, color:['text-indigo-300','text-indigo-400','text-yellow-500','text-red-500'][lvl-1], description:`精力 ${Math.round(s.energy.value)}%` });
  }
  if (s.stamina.value < 70) {
    const lvl = s.stamina.value < 10 ? 4 : s.stamina.value < 25 ? 3 : s.stamina.value < 45 ? 2 : 1;
    m.push({ id:'stamina', icon:'🏃', label:['有点累','疲惫','力竭','濒临崩溃'][lvl-1], level:lvl, color:['text-amber-300','text-amber-400','text-orange-500','text-red-500'][lvl-1], description:`体力 ${Math.round(s.stamina.value)}%` });
  }
  // 恐慌
  if (s.sanity.value < 70) {
    const lvl = s.sanity.value < 15 ? 4 : s.sanity.value < 30 ? 3 : s.sanity.value < 50 ? 2 : 1;
    m.push({ id:'panic', icon:'😰', label:['不安','紧张','恐慌','崩溃'][lvl-1], level:lvl, color:['text-purple-300','text-purple-400','text-purple-500','text-red-500'][lvl-1], description:`理智 ${Math.round(s.sanity.value)}%` });
  }
  // 受伤
  if (s.health.value < 80) {
    const lvl = s.health.value < 15 ? 4 : s.health.value < 35 ? 3 : s.health.value < 60 ? 2 : 1;
    m.push({ id:'hurt', icon:'🩸', label:['轻伤','受伤','重伤','濒死'][lvl-1], level:lvl, color:['text-red-300','text-red-400','text-red-500','text-red-600'][lvl-1], description:`生命 ${Math.round(s.health.value)}%` });
  }
  // 中毒
  if (s.infection.value > 0) {
    const lvl = s.infection.value > 75 ? 4 : s.infection.value > 50 ? 3 : s.infection.value > 25 ? 2 : 1;
    m.push({ id:'sick', icon:'☠️', label:['微毒','中毒','剧毒','毒入膏肓'][lvl-1], level:lvl, color:['text-green-400','text-green-500','text-yellow-500','text-red-500'][lvl-1], description:`中毒度 ${Math.round(s.infection.value)}%` });
  }
  // 寒冷
  if (world.weather.temperature < 5) {
    const lvl = world.weather.temperature < -10 ? 4 : world.weather.temperature < 0 ? 3 : world.weather.temperature < 5 ? 2 : 1;
    m.push({ id:'cold', icon:'🥶', label:['微冷','寒冷','严寒','冻伤'][lvl-1], level:lvl, color:['text-cyan-300','text-cyan-400','text-cyan-500','text-blue-600'][lvl-1], description:`温度 ${world.weather.temperature}°C` });
  }
  // 淋雨
  if (['rain','heavy_rain','thunderstorm'].includes(world.weather.current)) {
    const lvl = world.weather.current === 'thunderstorm' ? 3 : world.weather.current === 'heavy_rain' ? 2 : 1;
    m.push({ id:'wet', icon:'🌧️', label:['潮湿','湿透','暴雨'][lvl-1], level:lvl, color:['text-blue-300','text-blue-400','text-blue-500'][lvl-1], description:'暴露在雨中' });
  }
  // 负重
  const weightPct = player.currentCarryWeight / player.maxCarryWeight;
  if (weightPct > 0.7) {
    const lvl = weightPct > 1 ? 4 : weightPct > 0.9 ? 3 : weightPct > 0.8 ? 2 : 1;
    m.push({ id:'heavy', icon:'🏋️', label:['有点重','负重','超重','寸步难行'][lvl-1], level:lvl, color:['text-yellow-300','text-orange-400','text-orange-500','text-red-500'][lvl-1], description:`负重 ${Math.round(weightPct*100)}%` });
  }
  // 心情好（全满时）
  if (s.health.value > 90 && s.hunger.value > 80 && s.thirst.value > 80 && s.energy.value > 80 && s.sanity.value > 90) {
    m.push({ id:'happy', icon:'😊', label:'心情好', level:0, color:'text-green-400', description:'状态良好' });
  }
  return m.sort((a,b) => b.level - a.level);
};

export const StatsPanel: React.FC<StatsPanelProps> = ({ player, world }) => {
  const { state } = useGame();
  const moodles = getMoodles(player, world);
  const aiSummary = state.lastAIResponseSummary;
  const isRecentAI = aiSummary && (Date.now() - aiSummary.timestamp < 120000);
  const [playerPortrait, setPlayerPortrait] = useState<PlayerPortraitInfo | null>(() => loadPlayerPortrait());

  useEffect(() => {
    const sync = () => setPlayerPortrait(loadPlayerPortrait());
    window.addEventListener('storage', sync);
    const timer = setInterval(sync, 1500);
    return () => {
      window.removeEventListener('storage', sync);
      clearInterval(timer);
    };
  }, []);
  return (
    <div className="space-y-6 text-zinc-200 text-sm">

      {/* Moodles - PZ风格情绪指示器 */}
      {moodles.length > 0 && (
        <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
          <h3 className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-bold">状态异常</h3>
          <div className="grid grid-cols-2 gap-1.5">
            {moodles.map(m => (
              <div key={m.id} className={`flex items-center gap-2 px-2 py-1.5 rounded ${m.level >= 3 ? 'bg-red-900/30 border border-red-800/50 animate-pulse-slow' : m.level >= 2 ? 'bg-orange-900/20 border border-orange-800/30' : 'bg-zinc-800'}`} title={m.description}>
                <span className="text-sm">{m.icon}</span>
                <div className="min-w-0">
                  <div className={`text-[11px] font-medium ${m.color} truncate`}>{m.label}</div>
                  <div className="flex gap-0.5 mt-0.5">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`w-2 h-1 rounded-sm ${i <= m.level ? (m.level >= 3 ? 'bg-red-500' : m.level >= 2 ? 'bg-orange-500' : 'bg-yellow-500') : 'bg-zinc-700'}`}/>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* AI 最近影响摘要 */}
      {isRecentAI && aiSummary && (
        <div className="bg-cyan-900/20 rounded-lg p-2.5 border border-cyan-800/40 animate-pulse-slow">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Zap size={13} className="text-cyan-400" />
            <span className="text-[11px] font-medium text-cyan-300">AI 最近联动</span>
          </div>
          <div className="flex flex-wrap gap-1 text-[10px]">
            {aiSummary.cultivationChanged && (
              <span className="px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-300">修为变化</span>
            )}
            {aiSummary.bodyConditionChanged && (
              <span className="px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300">身体状态</span>
            )}
            {aiSummary.injuryChangeCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-red-900/60 text-red-300">伤势×{aiSummary.injuryChangeCount}</span>
            )}
            {aiSummary.economyChanged && (
              <span className="px-1.5 py-0.5 rounded bg-yellow-900/60 text-yellow-300">经济变动</span>
            )}
            {aiSummary.relationChangedNpcNames.length > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-pink-900/60 text-pink-300">关系×{aiSummary.relationChangedNpcNames.length}</span>
            )}
          </div>
        </div>
      )}
      
      {/* 玩家信息 */}
      <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center text-xl overflow-hidden shrink-0">
            {playerPortrait?.imageUrl ? (
              <img src={playerPortrait.imageUrl} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              <User size={22} className="text-zinc-500" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-white">{player.name}</h3>
            <p className="text-xs text-zinc-500">{player.role} · {player.age}岁</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">
              {player.traits.join(' · ')}
            </p>
            <div className="flex flex-wrap gap-1 mt-1 text-[10px]">
              <span className="px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300">门派：{player.sect || '无'}</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300">名望：{player.jianghuFame}</span>
              <span className={`px-1.5 py-0.5 rounded ${player.morality >= 60 ? 'bg-green-900/50 text-green-300' : player.morality >= 40 ? 'bg-yellow-900/50 text-yellow-300' : 'bg-red-900/50 text-red-300'}`}>侠义：{player.morality}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 世界信息 */}
      <div className="space-y-2 bg-zinc-800/30 rounded-lg p-3 border border-zinc-800">
        <div className="flex items-center gap-2 text-sm font-medium text-yellow-500">
          <Calendar size={14} />
          <span>{format(world.time, 'yyyy年MM月dd日')}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">
            {format(world.time, 'HH:mm')} · {getTimeOfDayLabel(world.timeOfDay)}
          </span>
          <span className="text-zinc-500">第{world.dayNumber}日</span>
        </div>
        
        <div className="flex items-center gap-4 pt-2 border-t border-zinc-800 mt-2">
          <div className="flex items-center gap-1.5 text-sm">
            <span>{getWeatherIcon(world.weather.current)}</span>
            <span className="text-zinc-300">{getWeatherLabel(world.weather.current)}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-zinc-400">
            <Thermometer size={12} />
            <span>{world.weather.temperature}°C</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-zinc-400">
            <Wind size={12} />
            <span>{world.weather.windSpeed}km/h</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-zinc-800 mt-2 text-xs">
          <MapPin size={12} className="text-blue-400" />
          <span className="text-zinc-300 truncate">{world.location}</span>
        </div>
        <div className="flex items-center gap-2 pt-2 text-xs">
          <span className={`px-2 py-0.5 rounded ${world.currentNoiseLevel > 60 ? 'bg-red-900/40 text-red-300' : world.currentNoiseLevel > 30 ? 'bg-orange-900/40 text-orange-300' : 'bg-green-900/30 text-green-300'}`}>
            🔊 动静 {Math.round(world.currentNoiseLevel)}
          </span>
          {world.lastLoudNoise && (
            <span className="text-[10px] text-zinc-500">最近：{world.lastLoudNoise.location}</span>
          )}
        </div>
        <div className="flex items-center gap-2 pt-2 text-xs">
          <span className="px-2 py-0.5 rounded bg-zinc-900/50 text-zinc-400">🕊️ 驿信: {world.internet ? '通达' : '断绝'}</span>
          <span className="px-2 py-0.5 rounded bg-zinc-900/50 text-zinc-400">🛖 灯火: {world.electricity ? '尚存' : '全灭'}</span>
          <span className="px-2 py-0.5 rounded bg-zinc-900/50 text-zinc-400">💰 市价: {world.currencySystem.marketIndex}</span>
        </div>
      </div>

      {/* 生命值 */}
      <div>
        <h3 className="text-xs font-bold text-zinc-500 uppercase mb-3 tracking-wider flex items-center gap-1">
          <Activity size={12} />
          生命状态
        </h3>
        <StatBar 
          label="气血" 
          value={player.stats.health.value} 
          max={player.stats.health.max} 
          icon={Heart} 
          color="text-red-500"
          criticalThreshold={25}
        />
        <StatBar 
          label="饱腹" 
          value={player.stats.hunger.value} 
          max={player.stats.hunger.max} 
          icon={Utensils} 
          color="text-orange-400"
          criticalThreshold={20}
        />
        <StatBar 
          label="口渴度" 
          value={player.stats.thirst.value} 
          max={player.stats.thirst.max} 
          icon={Droplets} 
          color="text-blue-400"
          criticalThreshold={15}
        />
        <StatBar 
          label="精力" 
          value={player.stats.energy.value} 
          max={player.stats.energy.max} 
          icon={Zap} 
          color="text-yellow-400"
          criticalThreshold={20}
        />
        <StatBar 
          label="体力" 
          value={player.stats.stamina.value} 
          max={player.stats.stamina.max} 
          icon={Activity} 
          color="text-amber-400"
          criticalThreshold={25}
        />
        <StatBar 
          label="理智" 
          value={player.stats.sanity.value} 
          max={player.stats.sanity.max} 
          icon={Brain} 
          color="text-purple-400"
          criticalThreshold={30}
        />
        {player.stats.infection.value > 0 && (
          <StatBar 
            label="中毒度" 
            value={player.stats.infection.value} 
            max={player.stats.infection.max} 
            icon={Biohazard} 
            color="text-green-500"
            showWarning={false}
          />
        )}
      </div>

      {/* 基础设施状态 */}
      <div className="space-y-2 pt-2 border-t border-zinc-800">
        <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2 tracking-wider flex items-center gap-1">
          <Shield size={12} />
          驿站民生
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className={`flex items-center gap-1.5 p-1.5 rounded ${world.electricity ? 'bg-green-900/30 text-green-400' : 'bg-zinc-900/50 text-zinc-400'}`}>
            <span>🕯️</span>
            <span>灯火: {world.electricity ? '通明' : '烛火/无灯'}</span>
          </div>
          <div className={`flex items-center gap-1.5 p-1.5 rounded ${world.internet ? 'bg-green-900/30 text-green-400' : 'bg-zinc-900/50 text-zinc-400'}`}>
            <span>📯</span>
            <span>驿信: {world.internet ? '畅通' : '停滞'}</span>
          </div>
          <div className={`flex items-center gap-1.5 p-1.5 rounded ${world.water ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
            <span>💧</span>
            <span>井水: {world.water ? '可用' : '枯竭'}</span>
          </div>
          <div className={`flex items-center gap-1.5 p-1.5 rounded ${world.gas ? 'bg-green-900/30 text-green-400' : 'bg-zinc-900/50 text-zinc-400'}`}>
            <span>🔥</span>
            <span>柴火: {world.gas ? '充足' : '紧缺'}</span>
          </div>
        </div>
      </div>

      {/* 世界状态指标 */}
      <div className="space-y-2 pt-2 border-t border-zinc-800">
        <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2 tracking-wider">世界态势</h3>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">瘴气浓度</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1 bg-zinc-700 rounded-full overflow-hidden">
                <div className="h-full bg-red-500" style={{ width: `${world.miasmaRate}%` }} />
              </div>
              <span className="text-red-400 w-8 text-right">{world.miasmaRate.toFixed(1)}%</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">江湖乱象</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1 bg-zinc-700 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500" style={{ width: `${world.chaosLevel}%` }} />
              </div>
              <span className="text-orange-400 w-8 text-right">{world.chaosLevel}%</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">朝廷管控</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1 bg-zinc-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${world.governmentControl}%` }} />
              </div>
              <span className="text-blue-400 w-8 text-right">{world.governmentControl}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 江湖名望 */}
      <div className="space-y-2 pt-2 border-t border-zinc-800">
        <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2 tracking-wider">江湖风评</h3>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">江湖名望</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1 bg-zinc-700 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500" style={{ width: `${player.jianghuFame}%` }} />
              </div>
              <span className="text-purple-400 w-8 text-right">{player.jianghuFame}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">侠义值</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1 bg-zinc-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${player.morality}%` }} />
              </div>
              <span className="text-emerald-400 w-8 text-right">{player.morality}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">盘缠</span>
            <div className="flex items-center gap-2">
              <span className="text-amber-300">{player.currency.silver}两</span>
              <span className="text-zinc-500">/ {player.currency.copper}文</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">市价指数</span>
            <span className="text-zinc-300">{world.currencySystem.marketIndex} · 过路税 {world.currencySystem.taxRate}%</span>
          </div>
        </div>
      </div>

      {/* 技能 */}
      {player.skills && player.skills.length > 0 && (
        <div className="pt-2 border-t border-zinc-800">
          <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2 tracking-wider">技能</h3>
          <div className="grid grid-cols-2 gap-2">
            {player.skills.map(skill => (
              <div key={skill.id} className="text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>{skill.name}</span>
                  <span className="text-zinc-500">Lv.{skill.level}</span>
                </div>
                <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mt-0.5">
                  <div 
                    className="h-full bg-cyan-500" 
                    style={{ width: `${(skill.experience / skill.expToNextLevel) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 武学 */}
      {player.martialArts && player.martialArts.length > 0 && (
        <div className="pt-2 border-t border-zinc-800">
          <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2 tracking-wider">武学</h3>
          <div className="grid grid-cols-2 gap-2">
            {player.martialArts.map(art => (
              <div key={art.id} className="text-xs bg-zinc-800/70 rounded p-2 border border-zinc-700">
                <div className="flex justify-between text-zinc-300">
                  <span>{art.name}</span>
                  <span className="text-zinc-500">Lv.{art.level}</span>
                </div>
                <div className="text-[10px] text-zinc-500 mt-1">{art.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 特性 */}
      {player.traits && player.traits.length > 0 && (
        <div className="pt-2 border-t border-zinc-800">
          <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2 tracking-wider">特性</h3>
          <div className="flex flex-wrap gap-1">
            {player.traits.map((trait, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded">
                {trait}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 装备栏 */}
      <div className="pt-2 border-t border-zinc-800">
        <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2 tracking-wider flex items-center gap-1">
          <Shield size={12} /> 装备栏
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {([
            { slot: 'head', label: '头部', Icon: HardHat },
            { slot: 'body', label: '躯干', Icon: Shield },
            { slot: 'mainHand', label: '主手', Icon: Swords },
            { slot: 'offHand', label: '副手', Icon: Shield },
            { slot: 'legs', label: '腿部', Icon: Layers },
            { slot: 'feet', label: '鞋子', Icon: Footprints },
            { slot: 'accessory1', label: '饰品1', Icon: Gem },
            { slot: 'backpack', label: '背包', Icon: Briefcase },
          ] as const).map(({ slot, label, Icon }) => {
            const equip = player.equipment[slot];
            return (
              <div key={slot} className={`flex items-center gap-1.5 p-1.5 rounded text-[10px] border ${equip ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-zinc-900/50 border-zinc-800 text-zinc-600'}`}>
                <span><Icon size={14} /></span>
                <div className="flex-1 min-w-0">
                  <div className="text-zinc-500 leading-none">{label}</div>
                  {equip ? (
                    <div className="text-zinc-200 truncate leading-tight">{equip.name}</div>
                  ) : (
                    <div className="text-zinc-700 italic leading-tight">空</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {/* 装备加成 */}
        {player.inventory.filter(i => i.isEquipped).length > 0 && (
          <div className="mt-2 p-2 bg-zinc-800/50 rounded border border-zinc-700">
            <div className="text-[10px] text-zinc-500 mb-1">装备加成</div>
            <div className="flex flex-wrap gap-1">
              {player.inventory.filter(i => i.isEquipped).map(eq => (
                <span key={eq.id} className="text-[9px] px-1 py-0.5 bg-blue-900/30 text-blue-300 rounded">
                  {eq.name} {eq.weaponData ? <><Swords size={10} className="inline mr-0.5" />{eq.weaponData.damage}</> : eq.type === 'clothing' ? <><Shield size={10} className="inline mr-0.5" />+5</> : ''}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 战绩统计 */}
      {(player.killCount.monsters > 0 || player.killCount.humans > 0 || player.killCount.heretics > 0) && (
        <div className="pt-2 border-t border-zinc-800">
          <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2 tracking-wider">战绩统计</h3>
          <div className="flex gap-4 text-xs">
            <span className="text-zinc-400">妖魔: <span className="text-red-400">{player.killCount.monsters}</span></span>
            <span className="text-zinc-400">歹人: <span className="text-zinc-300">{player.killCount.humans}</span></span>
            <span className="text-zinc-400">邪修: <span className="text-purple-400">{player.killCount.heretics}</span></span>
          </div>
        </div>
      )}

      {/* 负重 */}
      <div className="pt-2 border-t border-zinc-800">
        <div className="flex justify-between text-xs text-zinc-400">
          <span>负重</span>
          <span className={player.currentCarryWeight > player.maxCarryWeight * 0.8 ? 'text-orange-400' : ''}>
            {player.currentCarryWeight.toFixed(1)}/{player.maxCarryWeight}kg
          </span>
        </div>
        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1">
          <div className={`h-full transition-all ${player.currentCarryWeight > player.maxCarryWeight * 0.8 ? 'bg-orange-500' : 'bg-cyan-500'}`}
            style={{ width: `${Math.min(100, (player.currentCarryWeight / player.maxCarryWeight) * 100)}%` }} />
        </div>
      </div>
    </div>
  );
};
