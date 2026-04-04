FROM node:20-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install --production

# 复制构建后的代码
COPY dist ./dist

# 暴露端口
ENV PORT=8080
EXPOSE 8080

# 启动命令
CMD ["sh", "-c", "PORT=${PORT:-8080} node dist/index.js"]
