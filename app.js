import express from 'express';
import { marked } from 'marked';

const app = express();
const port = 3000;

// Middleware pour parser le JSON et le texte brut (plusieurs types)
app.use(express.json());
app.use(express.text({ type: 'text/markdown' }));
app.use(express.text({ type: 'text/plain' }));
app.use(express.text({ type: 'text/*' }));

// Constantes de style
const COLORS = {
  TEXT: "rgb(0, 0, 0)",
  HEADING: "rgb(8, 78, 189)"
};

const DEFAULT_TEXT_STYLE = {
  textAlignment: "JUSTIFY"
};

/**
 * Crée une décoration de couleur
 */
function createColorDecoration(color) {
  return {
    type: "COLOR",
    colorData: {
      foreground: color
    }
  };
}

/**
 * Crée une décoration de gras
 */
function createBoldDecoration() {
  return {
    type: "BOLD",
    fontWeightValue: 700
  };
}

/**
 * Crée une décoration d'italique
 */
function createItalicDecoration() {
  return {
    type: "ITALIC"
  };
}

/**
 * Crée une décoration de soulignement
 */
function createUnderlineDecoration() {
  return {
    type: "UNDERLINE"
  };
}

/**
 * Crée une décoration de lien
 */
function createLinkDecoration(url) {
  return {
    type: "LINK",
    linkData: {
      link: {
        url: url,
        target: "BLANK",
        rel: {
          noreferrer: true
        }
      }
    }
  };
}

/**
 * Parse le texte inline pour détecter le gras, italique, liens, etc.
 * Retourne un tableau de nodes TEXT avec les décorations appropriées
 */
function parseInlineText(text, baseColor = COLORS.TEXT) {
  // Regex pour détecter les patterns markdown inline
  const patterns = [
    { regex: /\*\*\*(.+?)\*\*\*/g, type: 'bolditalic' },
    { regex: /\*\*(.+?)\*\*/g, type: 'bold' },
    { regex: /\*(.+?)\*/g, type: 'italic' },
    { regex: /__(.+?)__/g, type: 'bold' },
    { regex: /_(.+?)_/g, type: 'italic' },
    { regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: 'link' }
  ];
  
  // Si pas de formatage, retourne un seul node
  const hasFormatting = patterns.some(p => p.regex.test(text));
  if (!hasFormatting) {
    return [{
      type: "TEXT",
      id: "",
      textData: {
        text: text,
        decorations: [createColorDecoration(baseColor)]
      }
    }];
  }
  
  // Parse le texte avec formatage
  const segments = [];
  
  // Trouve tous les matches et leur position
  const allMatches = [];
  
  // Reset regex
  patterns.forEach(p => p.regex.lastIndex = 0);
  
  // Bold ***text***
  let match;
  const boldItalicRegex = /\*\*\*(.+?)\*\*\*/g;
  while ((match = boldItalicRegex.exec(text)) !== null) {
    allMatches.push({ start: match.index, end: match.index + match[0].length, content: match[1], type: 'bolditalic', full: match[0] });
  }
  
  // Bold **text**
  const boldRegex = /\*\*(.+?)\*\*/g;
  while ((match = boldRegex.exec(text)) !== null) {
    // Vérifie qu'il n'y a pas de chevauchement avec bolditalic
    const overlaps = allMatches.some(m => m.type === 'bolditalic' && match.index >= m.start && match.index < m.end);
    if (!overlaps) {
      allMatches.push({ start: match.index, end: match.index + match[0].length, content: match[1], type: 'bold', full: match[0] });
    }
  }
  
  // Italic *text*
  const italicRegex = /\*([^*]+?)\*/g;
  while ((match = italicRegex.exec(text)) !== null) {
    const overlaps = allMatches.some(m => match.index >= m.start && match.index < m.end);
    if (!overlaps) {
      allMatches.push({ start: match.index, end: match.index + match[0].length, content: match[1], type: 'italic', full: match[0] });
    }
  }
  
  // Bold __text__
  const boldUnderRegex = /__(.+?)__/g;
  while ((match = boldUnderRegex.exec(text)) !== null) {
    const overlaps = allMatches.some(m => match.index >= m.start && match.index < m.end);
    if (!overlaps) {
      allMatches.push({ start: match.index, end: match.index + match[0].length, content: match[1], type: 'bold', full: match[0] });
    }
  }
  
  // Italic _text_
  const italicUnderRegex = /_([^_]+?)_/g;
  while ((match = italicUnderRegex.exec(text)) !== null) {
    const overlaps = allMatches.some(m => match.index >= m.start && match.index < m.end);
    if (!overlaps) {
      allMatches.push({ start: match.index, end: match.index + match[0].length, content: match[1], type: 'italic', full: match[0] });
    }
  }
  
  // Links [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  while ((match = linkRegex.exec(text)) !== null) {
    const overlaps = allMatches.some(m => match.index >= m.start && match.index < m.end);
    if (!overlaps) {
      allMatches.push({ start: match.index, end: match.index + match[0].length, content: match[1], type: 'link', url: match[2], full: match[0] });
    }
  }
  
  // Trier par position
  allMatches.sort((a, b) => a.start - b.start);
  
  // Construire les segments
  let currentPos = 0;
  for (const m of allMatches) {
    // Texte avant le match
    if (m.start > currentPos) {
      segments.push({ text: text.slice(currentPos, m.start), decorations: [createColorDecoration(baseColor)] });
    }
    
    // Le match lui-même - IMPORTANT: l'ordre est BOLD/ITALIC d'abord, puis COLOR (comme dans example.json)
    const decorations = [];
    if (m.type === 'bold') {
      decorations.push(createBoldDecoration());
      decorations.push(createColorDecoration(baseColor));
    } else if (m.type === 'italic') {
      decorations.push(createItalicDecoration());
      decorations.push(createColorDecoration(baseColor));
    } else if (m.type === 'bolditalic') {
      decorations.push(createBoldDecoration());
      decorations.push(createItalicDecoration());
      decorations.push(createColorDecoration(baseColor));
    } else if (m.type === 'link') {
      decorations.push(createColorDecoration(baseColor));
      decorations.push(createLinkDecoration(m.url));
      decorations.push(createUnderlineDecoration());
    }
    
    segments.push({ text: m.content, decorations });
    currentPos = m.end;
  }
  
  // Texte restant après le dernier match
  if (currentPos < text.length) {
    segments.push({ text: text.slice(currentPos), decorations: [createColorDecoration(baseColor)] });
  }
  
  // Convertir en nodes TEXT
  return segments.map(seg => ({
    type: "TEXT",
    id: "",
    textData: {
      text: seg.text,
      decorations: seg.decorations
    }
  }));
}

/**
 * Convertit un AST Markdown en document RICOS avec le style Wix complet
 * Structure conforme au format example.json
 */
function convertMarkdownToRicosManual(markdown) {
  const tokens = marked.lexer(markdown);
  
  const nodes = [];
  
  /**
   * Crée un paragraphe vide (pour l'espacement)
   */
  function createEmptyParagraph() {
    return {
      type: "PARAGRAPH",
      id: generateId(),
      style: {},
      paragraphData: {
        textStyle: { ...DEFAULT_TEXT_STYLE }
      }
    };
  }
  
  /**
   * Crée un paragraphe avec du texte
   */
  function createParagraph(text) {
    const textNodes = parseInlineText(text, COLORS.TEXT);
    return {
      type: "PARAGRAPH",
      id: generateId(),
      nodes: textNodes,
      style: {},
      paragraphData: {
        textStyle: { ...DEFAULT_TEXT_STYLE }
      }
    };
  }
  
  /**
   * Crée un heading (titre)
   */
  function createHeading(text, level) {
    const textNodes = parseInlineText(text, COLORS.HEADING);
    return {
      type: "HEADING",
      id: generateId(),
      nodes: textNodes,
      style: {},
      headingData: {
        level: level,
        textStyle: { ...DEFAULT_TEXT_STYLE }
      }
    };
  }
  
  /**
   * Crée un élément de liste
   */
  function createListItem(text) {
    const textNodes = parseInlineText(text, COLORS.TEXT);
    return {
      type: "LIST_ITEM",
      id: generateId(),
      nodes: [{
        type: "PARAGRAPH",
        id: generateId(),
        nodes: textNodes,
        style: {},
        paragraphData: {
          textStyle: { ...DEFAULT_TEXT_STYLE }
        }
      }]
    };
  }
  
  /**
   * Crée une liste à puces
   */
  function createBulletedList(items) {
    return {
      type: "BULLETED_LIST",
      id: generateId(),
      nodes: items.map(item => createListItem(item.text))
    };
  }
  
  /**
   * Crée une liste numérotée
   */
  function createOrderedList(items) {
    return {
      type: "ORDERED_LIST",
      id: generateId(),
      nodes: items.map(item => createListItem(item.text))
    };
  }
  
  /**
   * Crée une image
   * @param {string} src - URL Wix (static.wixstatic.com), ID Wix (853f36_xxx~mv2.png) ou URL externe
   * @param {string} alt - Texte alternatif
   * @param {number} width - Largeur (optionnel)
   * @param {number} height - Hauteur (optionnel)
   */
  function createImage(src, alt, width, height) {
    let imageId = null;
    let imageUrl = null;
    
    // Cas 1: URL Wix complète (static.wixstatic.com/media/xxx)
    if (src && src.includes('static.wixstatic.com/media/')) {
      // Extrait l'ID de l'URL: https://static.wixstatic.com/media/853f36_xxx~mv2.jpg -> 853f36_xxx~mv2.jpg
      const match = src.match(/static\.wixstatic\.com\/media\/([^\/\?]+)/);
      if (match) {
        imageId = match[1];
      }
    }
    // Cas 2: Déjà un ID Wix (pas une URL)
    else if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('//')) {
      imageId = src;
    }
    // Cas 3: URL externe (non-Wix)
    else if (src) {
      imageUrl = src;
    }
    
    const imageNode = {
      type: "IMAGE",
      id: generateId(),
      imageData: {
        containerData: {
          width: {
            custom: "380"
          },
          alignment: "CENTER",
          textWrap: true
        },
        image: {
          src: imageId ? { id: imageId } : { url: imageUrl },
          width: width || 1024,
          height: height || 1024
        },
        altText: alt || ""
      }
    };
    
    return imageNode;
  }
  
  /**
   * Crée un bloc de code
   */
  function createCodeBlock(code, language) {
    return {
      type: "CODE_BLOCK",
      id: generateId(),
      nodes: [{
        type: "TEXT",
        id: "",
        textData: {
          text: code,
          decorations: [createColorDecoration(COLORS.TEXT)]
        }
      }],
      style: {},
      codeBlockData: {
        language: language || "plaintext"
      }
    };
  }
  
  /**
   * Crée une citation
   */
  function createBlockquote(text) {
    const textNodes = parseInlineText(text, COLORS.TEXT);
    return {
      type: "BLOCKQUOTE",
      id: generateId(),
      nodes: [{
        type: "PARAGRAPH",
        id: generateId(),
        nodes: textNodes,
        style: {},
        paragraphData: {
          textStyle: { ...DEFAULT_TEXT_STYLE }
        }
      }],
      style: {}
    };
  }
  
  /**
   * Crée un séparateur
   */
  function createDivider() {
    return {
      type: "DIVIDER",
      id: generateId(),
      dividerData: {
        lineStyle: "SINGLE",
        width: "LARGE",
        alignment: "CENTER"
      }
    };
  }
  
  // Parcourt les tokens et construit le document RICOS
  tokens.forEach((token, index) => {
    switch (token.type) {
      case 'heading':
        // Ajoute un paragraphe vide avant le heading (sauf au début)
        if (nodes.length > 0) {
          nodes.push(createEmptyParagraph());
        }
        nodes.push(createHeading(token.text, token.depth));
        // Ajoute un paragraphe vide après le heading
        nodes.push(createEmptyParagraph());
        break;
        
      case 'paragraph':
        // Vérifie si c'est une image en markdown (peut être au milieu du texte aussi)
        const imageMatch = token.text.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imageMatch) {
          nodes.push(createImage(imageMatch[2], imageMatch[1]));
        } else {
          // Vérifie s'il y a des images inline dans le texte
          const inlineImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
          let hasInlineImages = inlineImageRegex.test(token.text);
          inlineImageRegex.lastIndex = 0; // Reset
          
          if (hasInlineImages) {
            // Sépare le texte et les images
            let lastIndex = 0;
            let match;
            while ((match = inlineImageRegex.exec(token.text)) !== null) {
              // Texte avant l'image
              if (match.index > lastIndex) {
                const textBefore = token.text.slice(lastIndex, match.index).trim();
                if (textBefore) {
                  nodes.push(createParagraph(textBefore));
                }
              }
              // L'image
              nodes.push(createImage(match[2], match[1]));
              lastIndex = match.index + match[0].length;
            }
            // Texte après la dernière image
            if (lastIndex < token.text.length) {
              const textAfter = token.text.slice(lastIndex).trim();
              if (textAfter) {
                nodes.push(createParagraph(textAfter));
              }
            }
          } else {
            nodes.push(createParagraph(token.text));
          }
        }
        break;
        
      case 'list':
        if (token.ordered) {
          nodes.push(createOrderedList(token.items));
        } else {
          nodes.push(createBulletedList(token.items));
        }
        break;
        
      case 'code':
        nodes.push(createCodeBlock(token.text, token.lang));
        break;
        
      case 'blockquote':
        nodes.push(createBlockquote(token.text));
        break;
        
      case 'hr':
        nodes.push(createDivider());
        break;
        
      case 'space':
        // Ajoute un paragraphe vide pour les espaces
        nodes.push(createEmptyParagraph());
        break;
        
      case 'html':
        // Gère les balises HTML img
        const htmlImgMatch = token.text.match(/<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>/i) ||
                            token.text.match(/<img[^>]+alt=["']([^"']*)["'][^>]*src=["']([^"']+)["'][^>]*>/i);
        if (htmlImgMatch) {
          // L'ordre des groupes dépend du match
          const src = htmlImgMatch[1].startsWith('http') || htmlImgMatch[1].includes('~mv2') ? htmlImgMatch[1] : htmlImgMatch[2];
          const alt = htmlImgMatch[1].startsWith('http') || htmlImgMatch[1].includes('~mv2') ? htmlImgMatch[2] : htmlImgMatch[1];
          nodes.push(createImage(src, alt));
        }
        break;
    }
  });
  
  return {
    nodes: nodes
  };
}

// Génère un ID unique pour les nodes RICOS (format court comme dans l'exemple Wix)
function generateId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  // Commence par quelques lettres
  for (let i = 0; i < 5; i++) {
    id += chars.charAt(Math.floor(Math.random() * 26)); // Lettres seulement
  }
  // Puis des chiffres
  for (let i = 0; i < 5; i++) {
    id += Math.floor(Math.random() * 10); // Chiffres seulement
  }
  return id;
}

/**
 * Route POST pour convertir du markdown en RICOS
 * Accepte du texte markdown dans le body (text/plain, text/markdown, ou JSON avec "markdown")
 */
app.post('/convert', (req, res) => {
  try {
    let markdown;
    
    // Support pour différents types de content
    if (typeof req.body === 'string' && req.body.trim().length > 0) {
      // Body est du texte brut (text/plain ou text/markdown)
      markdown = req.body;
    } else if (req.body && typeof req.body === 'object') {
      // Body est un objet JSON
      if (req.body.markdown) {
        markdown = req.body.markdown;
      } else if (req.body.content) {
        markdown = req.body.content;
      } else if (req.body.text) {
        markdown = req.body.text;
      }
    }
    
    // Vérifie si on a du markdown
    if (!markdown || markdown.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Le body doit contenir du markdown',
        hint: 'Envoyez du texte brut avec Content-Type: text/plain, ou un objet JSON avec une propriété "markdown", "content" ou "text"',
        received: {
          bodyType: typeof req.body,
          contentType: req.get('Content-Type'),
          bodyPreview: typeof req.body === 'string' ? req.body.substring(0, 100) : JSON.stringify(req.body).substring(0, 100)
        }
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