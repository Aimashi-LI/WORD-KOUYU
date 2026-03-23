import express from "express";
import cors from "cors";
import ocrRouter from "./routes/ocr";
import searchRouter from "./routes/search";
import userRouter from "./routes/user";
import aiRouter from "./routes/ai";

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/api/v1/health', (req, res) => {
  console.log('Health check success');
  res.status(200).json({ status: 'ok' });
});

// OCR 路由
app.use('/api/v1/ocr', ocrRouter);

// 搜索路由
app.use('/api/v1/search', searchRouter);

// 用户路由
app.use('/api/v1/user', userRouter);

// AI 路由
app.use('/api/v1/ai', aiRouter);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
