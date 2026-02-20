import express, { type Request, type Response } from 'express';
import multer from 'multer';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

const router = express.Router();

// 配置文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 限制 10MB
});

/**
 * OCR 识别接口
 * 接收图片文件，使用 LLM 视觉能力识别图片中的英文单词
 *
 * POST /api/v1/ocr/recognize
 * Body (multipart/form-data):
 *   - file: 图片文件
 * Response:
 *   {
 *     success: true,
 *     word: "识别到的英文单词"
 *   }
 */
router.post('/recognize', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '未上传图片文件' });
    }

    const { buffer, mimetype } = req.file;

    // 转换为 Base64
    const base64Image = buffer.toString('base64');
    const dataUri = `data:${mimetype};base64,${base64Image}`;

    // 提取请求头
    const customHeaders = HeaderUtils.extractForwardHeaders(
      req.headers as Record<string, string>
    );

    // 初始化 LLM Client
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 构建识别提示
    const messages = [
      {
        role: 'system' as const,
        content: '你是一个专业的 OCR 识别助手，专门用于识别英语单词学习卡片或单词列表。\n\n识别规则：\n1. 仔细识别图片中扫描框内的所有单词\n2. 提取每个单词的以下字段：\n   - word: 单词本身（只返回小写字母）\n   - phonetic: 音标（如果有）\n   - partOfSpeech: 词性（如 n.名词、v.动词、adj.形容词等）\n   - definition: 释义\n3. 如果有多个单词，返回一个数组；如果只有一个单词，也返回数组格式\n4. 以 JSON 数组格式返回结果，格式如下：\n   [\n     {\n       "word": "单词1",\n       "phonetic": "音标1",\n       "partOfSpeech": "词性1",\n       "definition": "释义1"\n     },\n     {\n       "word": "单词2",\n       "phonetic": "音标2",\n       "partOfSpeech": "词性2",\n       "definition": "释义2"\n     }\n   ]\n5. 如果某个字段没有识别到，返回空字符串\n6. 只返回 JSON 数组，不要包含任何其他文字'
      },
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: '请识别这张图片中扫描框内的所有英语单词卡片，提取每个单词的单词、音标、词性和释义信息。'
          },
          {
            type: 'image_url' as const,
            image_url: {
              url: dataUri,
              detail: 'high' as const
            }
          }
        ]
      }
    ];

    // 使用 vision 模型进行识别
    const response = await client.invoke(messages, {
      model: 'doubao-seed-1-6-vision-250815',
      temperature: 0.1 // 降低温度以获得更准确的结果
    });

    // 提取识别结果
    let content = response.content.trim();

    console.log('[OCR] 原始识别结果:', content);

    // 尝试提取 JSON 数组
    let arrayMatch = content.match(/\[[\s\S]*\]/);
    if (!arrayMatch) {
      // 尝试提取 JSON 对象（单个单词的情况）
      let objectMatch = content.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        // 如果是单个对象，包装成数组
        const jsonString = objectMatch[0];
        try {
          const singleWord = JSON.parse(jsonString);
          // 验证是否有效
          if (singleWord.word && singleWord.word.length >= 2) {
            const result = [cleanWordData(singleWord)];
            console.log('[OCR] 解析后的结果:', result);

            return res.json({
              success: true,
              words: result
            });
          }
        } catch (error) {
          console.error('[OCR] JSON 解析失败:', error);
        }
      }

      return res.json({
        success: false,
        error: '无法解析识别结果，请确保图片清晰且包含单词卡片信息'
      });
    }

    const jsonString = arrayMatch[0];
    let rawData: any[];

    try {
      rawData = JSON.parse(jsonString);
    } catch (error) {
      console.error('[OCR] JSON 解析失败:', error);
      return res.json({
        success: false,
        error: '解析识别结果失败，请重试'
      });
    }

    // 确保是数组格式
    if (!Array.isArray(rawData)) {
      rawData = [rawData];
    }

    // 清理和验证每个单词的数据
    const words = rawData
      .map(cleanWordData)
      .filter(word => word.word && word.word.length >= 2);

    console.log('[OCR] 解析后的结果:', words);

    // 验证是否有有效的单词
    if (words.length === 0) {
      return res.json({
        success: false,
        error: '未能识别到有效的英文单词。请确保图片清晰且包含单词卡片。'
      });
    }

    return res.json({
      success: true,
      words
    });

  } catch (error: any) {
    console.error('[OCR] 识别失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '识别失败，请重试'
    });
  }
});

// 清理单词数据的辅助函数
function cleanWordData(data: any) {
  const word = data.word?.replace(/[^a-z]/g, '') || '';
  const phonetic = data.phonetic?.trim() || '';
  const partOfSpeech = data.partOfSpeech?.trim() || '';
  const definition = data.definition?.trim() || '';

  return {
    word,
    phonetic,
    partOfSpeech,
    definition
  };
}

export default router;
