FROM node:18-alpine

WORKDIR /app

# 复制依赖文件
COPY package*.json ./
RUN npm ci --only=production

# 复制应用代码
COPY . .

# 创建数据目录
RUN mkdir -p /app/data && chmod 777 /app/data

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]
