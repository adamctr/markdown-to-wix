import express from 'express';
import { marked } from 'marked';

const app = express();
const port = 3000;

// Middleware pour parser le JSON et le texte brut
app.use(express.json());
app.use(express.text({ type: 'text/markdown' }));

/**
 * Convertit un AST Markdown (de marked) en document RICOS
 */
function convertMarkdownToRicos(markdown) {
  // Parse le markdown en tokens
  const tokens = marked.lexer(markdown);
  
  // Crée un builder RICOS
  const builder = new RicosContentBuilder();
  
  // Parcourt les tokens et construit le document RICOS
  tokens.forEach(token => {
    switch (token.type) {
      case 'heading':
        // Ajoute un titre selon le niveau
        builder.heading({
          level: token.depth,
          text: token.text
        });
        break;
        
      case 'paragraph':
        // Ajoute un paragraphe
        builder.paragraph({
          text: token.text
        });
        break;
        
      case 'list':
        // Ajoute une liste (ordonnée ou non)
        const listItems = token.items.map(item => item.text);
        if (token.ordered) {
          builder.orderedList({ items: listItems });
        } else {
          builder.bulletList({ items: listItems });
        }
        break;
        
      case 'code':
        // Ajoute un bloc de code
        builder.codeBlock({
          code: token.text,
          language: token.lang || 'plaintext'
        });
        break;
        
      case 'blockquote':
        // Ajoute une citation
        builder.blockquote({
          text: token.text
        });
        break;
        
      case 'hr':
        // Ajoute un séparateur
        builder.divider();
        break;
        
      case 'image':
        // Ajoute une image
        builder.image({
          src: token.href,
          alt: token.text || ''
        });
        break;
        
      case 'link':
        // Ajoute un lien (dans un paragraphe)
        builder.paragraph({
          text: token.text,
          decorations: [{
            type: 'LINK',
            url: token.href
          }]
        });
        break;
    }
  });
  
  // Retourne le document RICOS
  return builder.build();
}

/**
 * Convertit un AST Markdown en document RICOS (version simplifiée)
 * Cette fonction crée manuellement la structure RICOS
 */
function convertMarkdownToRicosManual(markdown) {
  const tokens = marked.lexer(markdown);
  
  const nodes = [];
  
  tokens.forEach(token => {
    switch (token.type) {
      case 'heading':
        nodes.push({
          type: 'HEADING',
          id: generateId(),
          nodes: [{
            type: 'PARAGRAPH',
            id: generateId(),
            nodes: [{
              type: 'TEXT',
              id: generateId(),
              textData: {
                text: token.text,
                decorations: []
              }
            }]
          }],
          headingData: {
            level: token.depth
          }
        });
        break;
        
      case 'paragraph':
        nodes.push({
          type: 'PARAGRAPH',
          id: generateId(),
          nodes: [{
            type: 'TEXT',
            id: generateId(),
            textData: {
              text: token.text,
              decorations: []
            }
          }]
        });
        break;
        
      case 'list':
        const listType = token.ordered ? 'ORDERED_LIST' : 'BULLET_LIST';
        nodes.push({
          type: listType,
          id: generateId(),
          nodes: token.items.map(item => ({
            type: 'LIST_ITEM',
            id: generateId(),
            nodes: [{
              type: 'PARAGRAPH',
              id: generateId(),
              nodes: [{
                type: 'TEXT',
                id: generateId(),
                textData: {
                  text: item.text,
                  decorations: []
                }
              }]
            }]
          }))
        });
        break;
        
      case 'code':
        nodes.push({
          type: 'CODE_BLOCK',
          id: generateId(),
          nodes: [],
          codeBlockData: {
            textData: {
              text: token.text,
              decorations: []
            }
          }
        });
        break;
        
      case 'blockquote':
        nodes.push({
          type: 'BLOCKQUOTE',
          id: generateId(),
          nodes: [{
            type: 'PARAGRAPH',
            id: generateId(),
            nodes: [{
              type: 'TEXT',
              id: generateId(),
              textData: {
                text: token.text,
                decorations: []
              }
            }]
          }]
        });
        break;
        
      case 'hr':
        nodes.push({
          type: 'DIVIDER',
          id: generateId(),
          nodes: [],
          dividerData: {}
        });
        break;
        
      case 'image':
        nodes.push({
          type: 'IMAGE',
          id: generateId(),
          nodes: [],
          imageData: {
            containerData: {
              width: { size: 'CONTENT' },
              alignment: 'CENTER'
            },
            image: {
              src: {
                url: token.href
              },
              alt: token.text || ''
            }
          }
        });
        break;
    }
  });
  
  return {
    nodes: nodes,
    metadata: {
      version: 1,
      createdTimestamp: new Date().toISOString(),
      updatedTimestamp: new Date().toISOString()
    },
    documentStyle: {}
  };
}

// Génère un ID unique pour les nodes RICOS
function generateId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Route POST pour convertir du markdown en RICOS
 * Accepte du texte markdown dans le body
 */
app.post('/convert', (req, res) => {
  try {
    let markdown;
    
    // Support pour différents types de content
    if (typeof req.body === 'string') {
      markdown = req.body;
    } else if (req.body.markdown) {
      markdown = req.body.markdown;
    } else {
      return res.status(400).json({ 
        error: 'Le body doit contenir du markdown (text/markdown) ou un objet JSON avec une propriété "markdown"' 
      });
    }
    
    // Convertit le markdown en RICOS
    const ricosContent = convertMarkdownToRicosManual(markdown);
    
    // Retourne le document RICOS
    res.json({
      success: true,
      data: ricosContent
    });
    
  } catch (error) {
    console.error('Erreur lors de la conversion:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la conversion du markdown',
      details: error.message 
    });
  }
});

/**
 * Route GET de test
 */
app.get('/', (req, res) => {
  res.json({
    message: 'API de conversion Markdown vers RICOS',
    endpoints: {
      'POST /convert': 'Convertit du markdown en format RICOS pour Wix',
      'GET /example': 'Retourne un exemple de conversion'
    }
  });
});

/**
 * Route GET avec un exemple
 */
app.get('/example', (req, res) => {
  const exampleMarkdown = `# Titre principal

Ceci est un paragraphe avec du texte.

## Sous-titre

- Item 1
- Item 2
- Item 3

### Liste ordonnée

1. Premier
2. Deuxième
3. Troisième

> Ceci est une citation

---

\`\`\`javascript
console.log('Hello World');
\`\`\`
`;

  const ricosContent = convertMarkdownToRicosManual(exampleMarkdown);
  
  res.json({
    markdown: exampleMarkdown,
    ricos: ricosContent
  });
});

app.listen(port, () => {
  console.log(`Serveur de conversion Markdown->RICOS lancé sur http://localhost:${port}`);
  console.log(`POST /convert - Envoie du markdown pour le convertir en RICOS`);
  console.log(`GET /example - Voir un exemple de conversion`);
});