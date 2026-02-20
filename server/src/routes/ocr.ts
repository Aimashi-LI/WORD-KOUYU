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
        content: '你是一个专业的 OCR 识别助手。请仔细识别图片中的英文单词。\n\n识别规则：\n1. 如果图片中只有一个英文单词，返回该单词\n2. 如果图片中有多个英文单词，只返回第一个或最突出/最明显的那个单词\n3. 如果没有英文单词，返回空字符串\n4. 只返回单词本身，不要包含任何解释、标点符号、数字或空格\n5. 确保返回的单词格式正确（例如：不能是多个单词连在一起）'
      },
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: '请识别这张图片中的英文单词。如果只有一个单词，返回它；如果有多个单词，只返回第一个或最突出的那个。'
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
      temperature: 0.1 // 进一步降低温度以获得更准确的结果
    });

    // 提取识别结果
    let recognizedWord = response.content.trim().toLowerCase();

    // 移除所有非字母字符
    recognizedWord = recognizedWord.replace(/[^a-z]/g, '');

    // 如果识别到的结果太长（超过20个字母），可能识别了多个单词
    if (recognizedWord.length > 20) {
      console.log('[OCR] 检测到可能的多个单词，尝试提取第一个单词');

      // 尝试分割单词（虽然已经被移除了空格，但可以根据常见单词模式）
      // 这里简单地只取前10个字母作为第一个单词
      recognizedWord = recognizedWord.substring(0, 10);
    }

    // 如果识别到的结果是空或太短（少于2个字母），返回空
    if (recognizedWord.length < 2) {
      recognizedWord = '';
    }

    console.log('[OCR] 原始识别结果:', response.content);
    console.log('[OCR] 处理后的结果:', recognizedWord);

    // 验证结果是否有效
    if (!recognizedWord) {
      return res.json({
        success: false,
        error: '未能识别到有效的英文单词。请确保图片清晰，并且只框选单个单词。'
      });
    }

    return res.json({
      success: true,
      word: recognizedWord
    });

  } catch (error: any) {
    console.error('[OCR] 识别失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '识别失败，请重试'
    });
  }
});

export default router;
