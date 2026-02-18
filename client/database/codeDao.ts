import { getDatabase } from './index';
import { Code } from './types';

// 获取所有编码
export async function getAllCodes(): Promise<Code[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>('SELECT * FROM codes ORDER BY letter ASC');
  return rows.map(mapToCode);
}

// 模糊搜索编码
export async function searchCodes(keyword: string): Promise<Code[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM codes 
     WHERE letter LIKE ? OR chinese LIKE ?
     ORDER BY letter ASC`,
    [`%${keyword}%`, `%${keyword}%`]
  );
  return rows.map(mapToCode);
}

// 根据字母获取编码
export async function getCodesByLetter(letter: string): Promise<Code[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM codes WHERE letter = ? ORDER BY chinese ASC',
    [letter]
  );
  return rows.map(mapToCode);
}

// 添加编码
export async function addCode(letter: string, chinese: string): Promise<number> {
  const db = getDatabase();
  const now = new Date().toISOString();
  
  try {
    const result = await db.runAsync(
      'INSERT INTO codes (letter, chinese, created_at) VALUES (?, ?, ?)',
      [letter, chinese, now]
    );
    return result.lastInsertRowId;
  } catch (error) {
    // 如果已存在，查找并返回现有 ID
    const existing = await db.getFirstAsync<any>(
      'SELECT id FROM codes WHERE letter = ? AND chinese = ?',
      [letter, chinese]
    );
    return existing?.id || 0;
  }
}

// 批量添加编码
export async function addCodes(codes: { letter: string; chinese: string }[]): Promise<number[]> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const ids: number[] = [];
  
  await db.withTransactionAsync(async () => {
    for (const code of codes) {
      try {
        const result = await db.runAsync(
          'INSERT INTO codes (letter, chinese, created_at) VALUES (?, ?, ?)',
          [code.letter, code.chinese, now]
        );
        ids.push(result.lastInsertRowId);
      } catch (error) {
        // 跳过重复项
      }
    }
  });
  
  return ids;
}

// 根据前缀匹配编码（用于自动提示）
export async function searchCodesByPrefix(prefix: string): Promise<Code[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM codes WHERE letter LIKE ? ORDER BY letter ASC LIMIT 10',
    [`${prefix}%`]
  );
  return rows.map(mapToCode);
}

// 根据字母精确匹配编码
export async function getCodeByLetter(letter: string): Promise<Code | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM codes WHERE letter = ?',
    [letter]
  );
  return row ? mapToCode(row) : null;
}

// 更新编码
export async function updateCode(id: number, letter: string, chinese: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    'UPDATE codes SET letter = ?, chinese = ? WHERE id = ?',
    [letter, chinese, id]
  );
}

// 删除编码
export async function deleteCode(id: number): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM codes WHERE id = ?', [id]);
}

// 重置编码库（清空所有编码并重新初始化）
export async function resetCodes(): Promise<number> {
  const db = getDatabase();
  
  // 清空所有编码
  await db.runAsync('DELETE FROM codes');
  console.log('已清空所有编码');
  
  // 使用完整的预设编码列表（136个）
  const presetCodes = [
    { letter: 'ab', chinese: '阿爸' }, { letter: 'ee', chinese: '眼睛' }, { letter: 'im', chinese: '一毛' },
    { letter: 'ac', chinese: '一次' }, { letter: 'er', chinese: '儿、耳、儿子' }, { letter: 'ive', chinese: '夏威夷' },
    { letter: 'ad', chinese: '阿弟、广告' }, { letter: 'ef', chinese: '衣服' }, { letter: 'jo', chinese: '机灵' },
    { letter: 'adu', chinese: '阿杜' }, { letter: 'eh', chinese: '遗憾' }, { letter: 'je', chinese: '姐' },
    { letter: 'al', chinese: '阿郎' }, { letter: 'el', chinese: '饮料' }, { letter: 'kn', chinese: '困难' },
    { letter: 'ali', chinese: '阿里' }, { letter: 'em', chinese: '姨妈、鹅毛' }, { letter: 'lib', chinese: '李白' },
    { letter: 'ap', chinese: '阿婆' }, { letter: 'ep', chinese: '硬盘' }, { letter: 'lf', chinese: '雷锋' },
    { letter: 'ar', chinese: '矮人、爱人' }, { letter: 'ev', chinese: '一胃' }, { letter: 'lm', chinese: '流氓' },
    { letter: 'ary', chinese: '一人妖' }, { letter: 'ex', chinese: '易错、恶心' }, { letter: 'ly', chinese: '老鹰、姥爷' },
    { letter: 'ard', chinese: '卡片' }, { letter: 'et', chinese: '外星人' }, { letter: 'lay', chinese: '腊月' },
    { letter: 'au', chinese: '遨游' }, { letter: 'ew', chinese: '遗忘' }, { letter: 'mini', chinese: '迷你裙' },
    { letter: 'aw', chinese: '一碗' }, { letter: 'ey', chinese: '鳄鱼' }, { letter: 'mt', chinese: '模特' },
    { letter: 'adv', chinese: '一大碗' }, { letter: 'equ', chinese: '艺曲' }, { letter: 'mir', chinese: '迷人' },
    { letter: 'ance', chinese: '一册' }, { letter: 'ence', chinese: '恩师' }, { letter: 'mul', chinese: '木楼' },
    { letter: 'bl', chinese: '玻璃' }, { letter: 'ele', chinese: '大象' }, { letter: 'mn', chinese: '魔女' },
    { letter: 'br', chinese: '病人' }, { letter: 'ea', chinese: '茶' }, { letter: 'mo', chinese: '魔' },
    { letter: 'by', chinese: '表演' }, { letter: 'est', chinese: '最' }, { letter: 'ment', chinese: '门童' },
    { letter: 'ble', chinese: '伯乐' }, { letter: 'ent', chinese: '疑难题' }, { letter: 'nt', chinese: '难题' },
    { letter: 'ch', chinese: '彩虹、吃' }, { letter: 'fl', chinese: '风铃' }, { letter: 'ne', chinese: '呢' },
    { letter: 'ck', chinese: '刺客' }, { letter: 'fr', chinese: '夫人' }, { letter: 'nu', chinese: '努力' },
    { letter: 'cl', chinese: '成龙' }, { letter: 'fe', chinese: '翻译' }, { letter: 'oa', chinese: '圆帽' },
    { letter: 'co', chinese: '可乐、错' }, { letter: 'fi', chinese: '父爱、飞' }, { letter: 'oo', chinese: '眼镜' },
    { letter: 'cir', chinese: '词人' }, { letter: 'gl', chinese: '公路' }, { letter: 'or', chinese: '或、或者' },
    { letter: 'cy', chinese: '抽烟' }, { letter: 'gr', chinese: '工人' }, { letter: 'ou', chinese: '藕' },
    { letter: 'com', chinese: '电脑' }, { letter: 'gy', chinese: '观音' }, { letter: 'op', chinese: '藕片' },
    { letter: 'con', chinese: '葱、虫' }, { letter: 'gue', chinese: '故意' }, { letter: 'ot', chinese: '呕吐' },
    { letter: 'cr', chinese: '超人' }, { letter: 'hy', chinese: '花园' }, { letter: 'of', chinese: '零分' },
    { letter: 'cu', chinese: '醋' }, { letter: 'ho', chinese: '猴' }, { letter: 'olo', chinese: '火箭' },
    { letter: 'dr', chinese: '敌人' }, { letter: 'hu', chinese: '湖' }, { letter: 'ow', chinese: '灯泡' },
    { letter: 'dy', chinese: '地狱' }, { letter: 'IC', chinese: 'IC卡' }, { letter: 'ob', chinese: '氧吧' },
    { letter: 'pa', chinese: '怕' }, { letter: 'se', chinese: '蛇' }, { letter: 'tl', chinese: '铁路' },
    { letter: 'ph', chinese: '炮灰' }, { letter: 'sw', chinese: '丝袜' }, { letter: 'tele', chinese: '泰勒' },
    { letter: 'pl', chinese: '漂亮' }, { letter: 'sp', chinese: '水瓶、山坡' }, { letter: 'ture', chinese: '土热' },
    { letter: 'pr', chinese: '仆人' }, { letter: 'sm', chinese: '寺庙' }, { letter: 'tain', chinese: '太难' },
    { letter: 'pe', chinese: '赔' }, { letter: 'sk', chinese: '水库' }, { letter: 'ur', chinese: '友人' },
    { letter: 'sus', chinese: '宿舍' }, { letter: 'um', chinese: '幼猫' }, { letter: 'pu', chinese: '扑' },
    { letter: 'sist', chinese: '姐姐' }, { letter: 'ut', chinese: '油条' }, { letter: 'ry', chinese: '日语' },
    { letter: 'sion', chinese: '绳子' }, { letter: 'ue', chinese: '友谊' }, { letter: 're', chinese: '热、花' },
    { letter: 'th', chinese: '天河、弹簧' }, { letter: 'udy', chinese: '邮递员' }, { letter: 'sh', chinese: '上海' },
    { letter: 'tion', chinese: '神、神仙' }, { letter: 'vo', chinese: '声音' }, { letter: 'sl', chinese: '司令' },
    { letter: 'tr', chinese: '树、唐仁' }, { letter: 'wh', chinese: '武汉' }, { letter: 'squ', chinese: '身躯' },
    { letter: 'ty', chinese: '太阳' }, { letter: 'was', chinese: '瓦斯' }, { letter: 'st', chinese: '石头' },
    { letter: 'tw', chinese: '台湾' }, { letter: 'wo', chinese: '我' }, { letter: 'dis', chinese: '的士' },
    { letter: 'in', chinese: '老鹰' }, { letter: 'un', chinese: '云南' }, { letter: 'non', chinese: '笑脸' },
    { letter: 'mis', chinese: '密室' }, { letter: 'an', chinese: '阿牛、一个' }, { letter: 'te', chinese: '特别' },
    { letter: 'for', chinese: '为了' }, { letter: 'post', chinese: '破石头' }, { letter: 'sub', chinese: '书包' },
    { letter: 'inter', chinese: '因特尔' }, { letter: 'act', chinese: '表演' }, { letter: 'ct', chinese: '彩糖' },
    { letter: 'am', chinese: '阿妈' }, { letter: 'ject', chinese: '借给他' }, { letter: 'po', chinese: '破' },
    { letter: 'rt', chinese: '软糖' }, { letter: 'ru', chinese: '肉' }, { letter: 'pt', chinese: '皮特' },
    { letter: 'str', chinese: '石头人' }, { letter: 'es', chinese: '二十、恶少' }, { letter: 'ss', chinese: '双胞胎' }
  ];
  
  const ids = await addCodes(presetCodes);
  console.log(`已重新加载 ${ids.length} 个编码`);
  
  return ids.length;
}

// 初始化默认编码库（包含常用编码）
export async function initDefaultCodes(): Promise<void> {
  const db = getDatabase();
  const countRow = await db.getFirstAsync<any>('SELECT COUNT(*) as count FROM codes');
  
  if (countRow?.count === 0) {
    await resetCodes();
  }
}

function mapToCode(row: any): Code {
  return {
    id: row.id,
    letter: row.letter,
    chinese: row.chinese,
    created_at: row.created_at
  };
}
