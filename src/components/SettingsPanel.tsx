import React, { useMemo, useState } from 'react';
import { GameState } from '../types/game';
import { X, Volume2, Type, Moon, Save, Smartphone, Monitor, Bot, Image as ImageIcon, MessageSquare, Wand2, Info, Settings2 } from 'lucide-react';

interface SettingsPanelProps {
  state: GameState;
  onClose: () => void;
  onUpdate: (type: string, payload: any) => void;
  deviceMode: 'auto' | 'mobile' | 'desktop';
  setDeviceMode: (mode: 'auto' | 'mobile' | 'desktop') => void;
}

const ThemeButton = ({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) => (
  <button onClick={onClick} className={`px-3 py-2 rounded-lg text-sm border transition ${active ? 'bg-amber-700 border-amber-500 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`}>{children}</button>
);

const SliderRow = ({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-sm"><span className="text-zinc-300">{label}</span><span className="text-zinc-500">{value}</span></div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-amber-500" />
  </div>
);

const ToggleCard = ({ title, desc, active, onClick }: { title: string; desc: string; active: boolean; onClick: () => void }) => (
  <button onClick={onClick} className={`w-full text-left rounded-xl border p-3 transition ${active ? 'border-amber-600 bg-amber-950/20' : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800/70'}`}>
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-medium text-white">{title}</div>
        <div className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{desc}</div>
      </div>
      <div className={`w-11 h-6 rounded-full p-1 transition shrink-0 ${active ? 'bg-amber-600' : 'bg-zinc-700'}`}>
        <div className={`w-4 h-4 rounded-full bg-white transition ${active ? 'translate-x-5' : ''}`} />
      </div>
    </div>
  </button>
);

const InfoCard = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
    <div className="flex items-start gap-3">
      <div className="text-amber-400 mt-0.5">{icon}</div>
      <div>
        <div className="text-sm font-medium text-white">{title}</div>
        <div className="text-[11px] text-zinc-500 leading-relaxed mt-1">{desc}</div>
      </div>
    </div>
  </div>
);

const SettingsPanel: React.FC<SettingsPanelProps> = ({ state, onClose, onUpdate, deviceMode, setDeviceMode }) => {
  const [saveTip, setSaveTip] = useState('');

  const storageSummary = useMemo(() => {
    const keys = [
      'jianghu_game_save', 'game_birth_settings', 'jianghu_world_seed', 'jianghu_npc_portraits',
      'jianghu_scene_images', 'comfyui_workflow_presets', 'apoc_ai_chat_messages', 'apoc_ai_chat_draft',
      'ai_api_config', 'jianghu_player_portrait'
    ];
    const used = keys.reduce((sum, key) => sum + (localStorage.getItem(key)?.length || 0), 0);
    return `${(used / 1024).toFixed(1)} KB`;
  }, [state.logs.length, state.npcs.length]);

  const handleSave = () => {
    localStorage.setItem('game_device_mode', deviceMode);
    setSaveTip('设置已保存');
    setTimeout(() => setSaveTip(''), 1800);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <div className="text-lg font-bold text-white flex items-center gap-2"><Moon size={18} className="text-amber-400" />界面与系统设置</div>
            <div className="text-xs text-zinc-500">这里控制声音、文本、显示模式，以及 AI / 聊天 / 生图相关全局体验</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400"><X size={18} /></button>
        </div>

        <div className="p-5 grid lg:grid-cols-2 gap-5">
          <div className="space-y-5">
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-4">
              <div className="text-sm font-semibold text-white flex items-center gap-2"><Volume2 size={15} />声音与通知</div>
              <div className="grid grid-cols-2 gap-3">
                <ThemeButton active={state.settings.soundEnabled} onClick={() => onUpdate('UPDATE_SETTINGS', { soundEnabled: !state.settings.soundEnabled })}>{state.settings.soundEnabled ? '音效已开启' : '音效已关闭'}</ThemeButton>
                <ThemeButton active={state.settings.notificationsEnabled} onClick={() => onUpdate('UPDATE_SETTINGS', { notificationsEnabled: !state.settings.notificationsEnabled })}>{state.settings.notificationsEnabled ? '通知已开启' : '通知已关闭'}</ThemeButton>
              </div>
              <div className="text-xs text-zinc-500">音效控制点击声、危险提示和背景氛围；通知控制右下角提示条。</div>
            </div>

            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-4">
              <div className="text-sm font-semibold text-white flex items-center gap-2"><Type size={15} />阅读与显示</div>
              <SliderRow label="字体大小" value={state.settings.fontSize} min={12} max={22} onChange={(v) => onUpdate('UPDATE_SETTINGS', { fontSize: v })} />
              <SliderRow label="文本速度" value={state.settings.textSpeed} min={1} max={5} onChange={(v) => onUpdate('UPDATE_SETTINGS', { textSpeed: v })} />
              <div className="space-y-2">
                <div className="text-sm text-zinc-300">主题色调</div>
                <div className="flex flex-wrap gap-2">
                  {['dark', 'darker', 'blood'].map((theme) => <ThemeButton key={theme} active={state.settings.theme === theme} onClick={() => onUpdate('UPDATE_SETTINGS', { theme })}>{theme === 'dark' ? '深色' : theme === 'darker' ? '极夜' : '血色'}</ThemeButton>)}
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-4">
              <div className="text-sm font-semibold text-white flex items-center gap-2"><Save size={15} />存档与运行</div>
              <div className="grid grid-cols-2 gap-3">
                <ThemeButton active={state.settings.autoSave} onClick={() => onUpdate('UPDATE_SETTINGS', { autoSave: !state.settings.autoSave })}>{state.settings.autoSave ? '自动保存：开' : '自动保存：关'}</ThemeButton>
                <ThemeButton active={state.settings.showTutorials} onClick={() => onUpdate('UPDATE_SETTINGS', { showTutorials: !state.settings.showTutorials })}>{state.settings.showTutorials ? '新手提示：开' : '新手提示：关'}</ThemeButton>
              </div>
              <SliderRow label="自动保存间隔（分钟）" value={state.settings.autoSaveInterval} min={1} max={20} onChange={(v) => onUpdate('UPDATE_SETTINGS', { autoSaveInterval: v })} />
              <div className="text-xs text-zinc-500">本地设置、聊天记录、人物画像和 ComfyUI 流程缓存占用：{storageSummary}</div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-4">
              <div className="text-sm font-semibold text-white flex items-center gap-2"><Smartphone size={15} />设备模式</div>
              <div className="grid grid-cols-3 gap-2">
                <ThemeButton active={deviceMode === 'auto'} onClick={() => setDeviceMode('auto')}>自动</ThemeButton>
                <ThemeButton active={deviceMode === 'mobile'} onClick={() => setDeviceMode('mobile')}><span className="inline-flex items-center gap-1"><Smartphone size={13} />手机</span></ThemeButton>
                <ThemeButton active={deviceMode === 'desktop'} onClick={() => setDeviceMode('desktop')}><span className="inline-flex items-center gap-1"><Monitor size={13} />电脑</span></ThemeButton>
              </div>
              <div className="text-xs text-zinc-500">手机模式会压缩侧栏并优化按钮触控；电脑模式显示更多信息。</div>
            </div>

            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
              <div className="text-sm font-semibold text-white flex items-center gap-2"><Bot size={15} />AI 与聊天</div>
              <InfoCard icon={<Bot size={15} />} title="AI 模型与 API" desc="模型切换、API 密钥、自动AI交互、严格 JSON 输出等，统一在右侧 AI 面板里设置和测试；这里不再放无效按钮，避免误导。" />
              <InfoCard icon={<MessageSquare size={15} />} title="聊天记录与草稿" desc="聊天记录、网页草稿、文本草稿会自动缓存。切换人物/地图/背包页后，回到 AI 页一般会恢复。" />
            </div>

            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
              <div className="text-sm font-semibold text-white flex items-center gap-2"><ImageIcon size={15} />ComfyUI / 生图</div>
              <InfoCard icon={<Wand2 size={15} />} title="文生图流程与节点" desc="ComfyUI 地址、API workflow JSON、节点自动识别、多流程预设、自动生成开关，都在“场景图”面板里配置。这里仅保留说明。" />
              <InfoCard icon={<Settings2 size={15} />} title="主聊天框插图联动" desc="开启 AI 新剧情自动生成场景图后，生成成功的图片会插入主叙事聊天框；也可手动点“生成情节图 / 角色立绘”。" />
            </div>

            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
              <div className="text-sm font-semibold text-white flex items-center gap-2"><Info size={15} />玩法辅助</div>
              <div className="grid grid-cols-2 gap-3">
                <ThemeButton active={!state.settings.permadeath} onClick={() => onUpdate('UPDATE_SETTINGS', { permadeath: !state.settings.permadeath })}>{state.settings.permadeath ? '永久死亡：开' : '永久死亡：关'}</ThemeButton>
                <ThemeButton active={state.settings.difficulty === 'easy'} onClick={() => onUpdate('UPDATE_SETTINGS', { difficulty: state.settings.difficulty === 'easy' ? 'normal' : 'easy' })}>{state.settings.difficulty === 'easy' ? '难度：简单' : '难度：普通/以上'}</ThemeButton>
              </div>
              <div className="text-xs text-zinc-500">这里只调整全局体验，详细数值仍建议在“江湖管理阁”内修改。</div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-zinc-800 flex items-center justify-between">
          <div className="text-xs text-green-400 min-h-4">{saveTip}</div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm">关闭</button>
            <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-sm flex items-center gap-2"><Save size={14} />保存设置</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
