import React from 'react';
import { useGame } from '../context/GameContext';
import { getShichen, getSeason, getReputationModifier } from '../systems/WorldSimulation';
import { format } from 'date-fns';
import { Cloud, Thermometer, Wind, MapPin, Clock, Coins, Star, Shield, Sun, CloudRain, CloudLightning, CloudFog, CloudSnow, Droplets, AlertTriangle, Lightbulb } from 'lucide-react';

const getWeatherIcon = (weather: string): React.ReactNode => {
  const icons: Record<string, React.ReactNode> = {
    'clear': <Sun size={28} className="text-yellow-400" />,
    'cloudy': <Cloud size={28} className="text-zinc-300" />,
    'overcast': <Cloud size={28} className="text-zinc-400" />,
    'drizzle': <CloudRain size={28} className="text-blue-300" />,
    'rain': <CloudRain size={28} className="text-blue-400" />,
    'heavy_rain': <CloudLightning size={28} className="text-purple-400" />,
    'thunderstorm': <CloudLightning size={28} className="text-purple-400" />,
    'fog': <CloudFog size={28} className="text-zinc-400" />,
    'snow': <CloudSnow size={28} className="text-blue-200" />,
    'blizzard': <CloudSnow size={28} className="text-blue-100" />
  };
  return icons[weather] || <Sun size={28} className="text-yellow-400" />;
};

const getWeatherLabel = (weather: string) => {
  const labels: Record<string, string> = {
    'clear': '晴朗', 'cloudy': '多云', 'overcast': '阴天', 'drizzle': '细雨',
    'rain': '雨天', 'heavy_rain': '暴雨', 'thunderstorm': '雷暴',
    'fog': '浓雾', 'snow': '小雪', 'blizzard': '风雪'
  };
  return labels[weather] || weather;
};

export const WorldInfoPanel: React.FC = () => {
  const { state } = useGame();
  const { world, player } = state;
  
  const hour = new Date(world.time).getHours();
  const month = new Date(world.time).getMonth();
  const shichen = getShichen(hour);
  const season = getSeason(month);
  const reputation = getReputationModifier(player.jianghuFame, player.morality);
  
  const location = state.locations.find(l => l.name === world.location);
  const nearbyNPCs = state.npcs.filter(n => n.location === world.location && n.status === 'alive');
  
  return (
    <div className="bg-zinc-900/80 backdrop-blur rounded-lg border border-zinc-700 p-4 space-y-4">
      {/* 时间信息 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-amber-400" />
          <span className="text-amber-300 font-medium">{shichen.name}</span>
          <span className="text-zinc-500 text-sm">· {shichen.desc}</span>
        </div>
        <div className="text-right">
          <div className="text-zinc-300 text-sm">{format(world.time, 'yyyy年MM月dd日')}</div>
          <div className="text-zinc-500 text-xs">第{world.dayNumber}日 · {season.name}季</div>
        </div>
      </div>
      
      {/* 天气信息 */}
      <div className="flex items-center gap-4 p-3 bg-zinc-800/50 rounded-lg">
        <div className="text-2xl">{getWeatherIcon(world.weather.current)}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Cloud size={14} className="text-zinc-400" />
            <span className="text-zinc-200">{getWeatherLabel(world.weather.current)}</span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-zinc-400">
            <span className="flex items-center gap-1">
              <Thermometer size={12} />
              {world.weather.temperature}°C
            </span>
            <span className="flex items-center gap-1">
              <Wind size={12} />
              {world.weather.windSpeed}km/h
            </span>
            <span>湿度 {world.weather.humidity}%</span>
          </div>
        </div>
      </div>
      
      {/* 位置信息 */}
      <div className="p-3 bg-zinc-800/50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <MapPin size={14} className="text-blue-400" />
          <span className="text-zinc-200 font-medium">{world.location}</span>
          {location && location.dangerLevel > 40 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-red-900/50 text-red-300 rounded">危险</span>
          )}
        </div>
        {location && (
          <div className="text-xs text-zinc-400 space-y-1">
            <p>{location.description}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1"><Lightbulb size={12} />光线: {location.lightLevel > 60 ? '明亮' : location.lightLevel > 30 ? '昏暗' : '黑暗'}</span>
              <span className="flex items-center gap-1"><AlertTriangle size={12} />危险: {location.dangerLevel}%</span>
              {location.hasWater && <span className="flex items-center gap-1"><Droplets size={12} />有水源</span>}
            </div>
            {nearbyNPCs.length > 0 && (
              <div className="mt-2 pt-2 border-t border-zinc-700">
                <span className="text-zinc-500">在场之人：</span>
                <span className="text-zinc-300">{nearbyNPCs.map(n => n.name).join('、')}</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* 声望信息 */}
      <div className="p-3 bg-zinc-800/50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Star size={14} className="text-purple-400" />
            <span className="text-zinc-200">江湖风评</span>
          </div>
          <span className="text-purple-300 text-sm">{reputation.description}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-zinc-500">名望</span>
            <span className="text-purple-300">{player.jianghuFame}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">侠义</span>
            <span className={player.morality >= 60 ? 'text-green-300' : player.morality <= 40 ? 'text-red-300' : 'text-zinc-300'}>
              {player.morality}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">交易折扣</span>
            <span className="text-amber-300">{Math.round((1 - reputation.priceModifier) * 100)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">信任加成</span>
            <span className="text-blue-300">+{reputation.trustModifier}</span>
          </div>
        </div>
      </div>
      
      {/* 盘缠 */}
      <div className="p-3 bg-zinc-800/50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Coins size={14} className="text-amber-400" />
          <span className="text-zinc-200">盘缠</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Coins size={18} className="text-zinc-300" />
            <span className="text-amber-300 font-medium">{player.currency.silver}</span>
            <span className="text-zinc-500 text-xs">两</span>
          </div>
          <div className="flex items-center gap-1">
            <Coins size={16} className="text-amber-600" />
            <span className="text-amber-400">{player.currency.copper}</span>
            <span className="text-zinc-500 text-xs">文</span>
          </div>
          <div className="text-xs text-zinc-500">
            (合计 {player.currency.silver * 100 + player.currency.copper} 文)
          </div>
        </div>
        <div className="mt-2 text-[10px] text-zinc-500">
          当前市价指数: {world.currencySystem.marketIndex} · 过路税: {world.currencySystem.taxRate}%
        </div>
      </div>
      
      {/* 境界 */}
      <div className="p-3 bg-zinc-800/50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={14} className="text-cyan-400" />
          <span className="text-zinc-200">修为</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-cyan-300">
            {['凡人', '锻体境', '感气境', '通脉境', '凝气境', '筑基境', '金丹境', '元婴境'][player.cultivationStage || 0]}
          </span>
          <span className="text-zinc-500">门派: {player.sect || '无门无派'}</span>
        </div>
        {player.martialArts && player.martialArts.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {player.martialArts.map(art => (
              <span key={art.id} className="px-2 py-0.5 text-[10px] bg-cyan-900/30 text-cyan-300 rounded">
                {art.name} Lv.{art.level}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {/* 当前活动提示 */}
      <div className="text-xs text-zinc-500 text-center">
        {shichen.activity === '歇息' && '夜深了，该找地方歇息了。'}
        {shichen.activity === '早膳' && '是时候用些早点了。'}
        {shichen.activity === '午歇' && '正午时分，可以休息片刻。'}
        {shichen.activity === '晚膳' && '天色将晚，该用晚膳了。'}
      </div>
    </div>
  );
};
