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
        content: '你是一个专业的 OCR 识别助手。请识别图片中的英文单词。只返回识别到的英文单词，不要包含任何解释、标点符号或其他文字。如果图片中没有英文单词，返回空字符串。'
      },
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: '请识别这张图片中的英文单词，只返回单词本身。'
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
      temperature: 0.2 // 降低温度以获得更准确的结果
    });

    // 提取识别结果
    let recognizedWord = response.content.trim();

    // 移除可能的标点符号和多余空格
    recognizedWord = recognizedWord.replace(/[^a-zA-Z]/g, '');

    // 只返回纯英文单词
    if (!/^[a-zA-Z]+$/.test(recognizedWord)) {
      recognizedWord = '';
    }

    console.log('[OCR] 识别结果:', recognizedWord);

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
