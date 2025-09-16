# Versão 1

# 1. Escolhemos uma imagem base do Node.js
# Usar a versão 'alpine' é uma boa prática para manter a imagem pequena e segura.
FROM node:18-alpine

# 2. Definimos o diretório de trabalho dentro do contêiner
WORKDIR /usr/src/app

# 3. Copiamos os arquivos de dependências
# Copiar package.json e package-lock.json primeiro aproveita o cache do Docker.
# Se esses arquivos não mudarem, o Docker não reinstala as dependências.
COPY package*.json ./

# 4. Instalamos as dependências de produção
RUN npm install --only=production

# 5. Copiamos o resto do código da aplicação
COPY . .

# 6. Compilamos o código TypeScript para JavaScript
RUN npm run build

# 7. Expomos a porta que a aplicação vai usar
EXPOSE 3009

# 8. Definimos o comando para iniciar a aplicação
CMD ["npm", "start"]