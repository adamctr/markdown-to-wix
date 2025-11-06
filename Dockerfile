# Utilise une image officielle Node.js légère
FROM node:22-slim

# Crée un répertoire de travail
WORKDIR /app

# Copie uniquement les fichiers nécessaires à l'installation des dépendances
COPY package*.json ./

# Nettoie le cache NPM et installe les dépendances
RUN npm install --legacy-peer-deps && npm cache clean --force

# Copie le reste des fichiers
COPY . .

# Expose le port utilisé par ton application
EXPOSE 3000

# Lance l'application
CMD ["node", "app.js"]

