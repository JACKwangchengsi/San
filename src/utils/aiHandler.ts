import { AIResponse, GameState } from "../types/game";
import { logger } from "./logger";

export const AI_INSTRUCTION_PROMPT = `
你是一个高质量武侠文本冒险游戏的"江湖主持人"。
世界观：架空武侠江湖，门派林立、恩怨纷争、侠义与权谋并存。主角为初入江湖的少年侠客。

任务要求：
1. 续写下一段剧情（200-400字），中文描写，兼顾环境、动作、心理与细节。
2. NPC有自主目的与情绪变化，世界不以玩家为中心。
3. 严格输出JSON，不要Markdown、不许多余文字。
4. 未变化的字段用空数组/空对象/null。
5. 必须提供3-5个choices与consequence_hint。

关键规则：
- new_items 仅能是"可拾取实物"（兵器、药材、银两、铜钱、干粮、水囊、火折子、地图、文书、信物、锁钥等）。
- 禁止出现现代物品：手机、电脑、电池、充电、网络、对讲机、枪械、药片等。
- 伤势/内伤/疼痛/恐惧/情绪/风险/地点 不是物品，禁止写入new_items。
- 伤势应体现在 story_text 或 player_stat_changes.health。

严格JSON格式（所有子系统联动必填字段）：
{
  "story_text": "string",
  "dialogue": [{"speaker":"姓名","text":"对话","mood":"情绪"}],
  "time_passed_minutes": 5,
  "location_change": null,
  "weather_change": null,
  "new_items": [{"id":"item_x","name":"物品名","type":"food|drink|medicine|tool|weapon|document|misc","description":"简短描述","quantity":1}],
  "removed_items": [],
  "npc_updates": [{"id":"npc_id或姓名","changes":{"status":"alive|dead|corrupted","location":"位置","mood":"情绪"}}],
  "new_npcs": [],
  "player_stat_changes": {"health":0,"hunger":0,"thirst":0,"energy":0,"sanity":0,"infection":0,"stamina":0},
  "player_injuries": [{"name":"伤势名","bodyPart":"部位","severity":1,"effects":[{"stat":"health","value":-5}]}],
  "discoveries": [],
  "events": [],
  "choices": [{"id":"1","text":"选项文字","consequence_hint":"可能后果"}],
  "reputation_change": 0,
  "righteousness_change": 0,
  "money_change": {"silver":0,"copper":0},
  "martial_progress": {"skill":"武学名","progress":10},
  "realm_breakthrough": {"newRealm":"境界名","level":1},
  "faction_reputation_changes": [{"faction":"势力名","delta":5}],
  "recipe_discoveries": ["配方名"],
  "buff_additions": [{"name":"状态","description":"效果","duration":60,"effects":[{"stat":"health","value":5}]}],
  "debuff_additions": [{"name":"异常","description":"效果","duration":60,"effects":[{"stat":"health","value":-3}]}],
  "injury_changes": [{"name":"伤势名","bodyPart":"部位","severity":3,"healed":false}],
  "npc_relationship_changes": [{"npcName":"npc姓名","relationDelta":5,"trustDelta":3,"romanceStage":"interested","affinity":10,"event":"事件简述"}],
  "economy_changes": {"marketIndex":0,"taxRate":0},
  "body_condition_changes": {"temperature":0,"fatigue":0}
}

字段约束（重要）：
- faction_reputation_changes: 当剧情涉及门派/势力/组织的声望变化时使用，faction名用中文（武当、少林、魔教、丐帮、官府、黑风寨）
- recipe_discoveries: 当玩家学到新锻造/制药/烹饪配方时，填配方名
- buff_additions: 正面状态如真气护体、药力发作、行气加速
- debuff_additions: 负面状态如中毒、内伤、寒气入体
- injury_changes: 新增伤势或已有伤势恶化/愈合，healed=true表示痊愈
- npc_relationship_changes: NPC好感/信任变化，romanceStage填none/interested/close/ambiguous/lover/engaged/married/broken
- economy_changes: 涉及物价波动、官府税率调整时使用
- body_condition_changes: 体温异常（中暑/受寒）或疲劳累积时使用
- 所有未变化字段用空数组/空对象/null/0
`;

export function generateContextPrompt(state: GameState, userAction: string): string {
  const playerInfo = `Player: ${state.player.name} (Role: ${state.player.role})
Inventory: ${state.player.inventory.map(i => i.name).join(', ')}
Stats: Health=${state.player.stats.health.value}, Hunger=${state.player.stats.hunger.value}`;

  const npcInfo = `Nearby NPCs: ${state.npcs.filter(n => n.location === state.world.location).map(n => `${n.name} (${n.status})`).join(', ')}`;
  
  const worldInfo = `Location: ${state.world.location}
Time: ${new Date(state.world.time).toLocaleString()}
Weather: ${state.world.weather}`;

  return `
${AI_INSTRUCTION_PROMPT}

[CURRENT STATE]
${playerInfo}
${npcInfo}
${worldInfo}

[PLAYER ACTION]
${userAction}

[STRICT OUTPUT]
- JSON only (no markdown, no extra words)
- Use the exact keys from the format
- If a field is not used, return empty array/object or null
`;
}

export function parseAIResponse(jsonString: string): AIResponse | null {
  try {
    // Attempt to clean markdown if present (e.g. ```json ... ```)
    const cleanString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanString) as AIResponse;
  } catch (e) {
    logger.ai.error('AI Response 解析失败', e);
    return null;
  }
}
