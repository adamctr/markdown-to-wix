# Wix Content Creator - Markdown to RICOS

Simple Express API to convert Markdown content into RICOS (Rich Content) format for Wix.

## 📋 Description

This project provides a minimal REST API with a single main route that transforms Markdown text into RICOS, the rich content format used by Wix.

## 🚀 Installation

### Prerequisites

* Node.js 22 or higher
* npm

### Local installation

```bash
# Install dependencies
npm install --legacy-peer-deps
```

### With Docker

```bash
# Build the image
docker build -t wix-content-creator .

# Run the container
docker run -p 3000:3000 wix-content-creator
```

## 🎯 Usage

### Start the server

```bash
node app.js
```

The server will run on `http://localhost:3000`

### API Endpoints

#### `POST /convert`

Converts Markdown content into RICOS format.

**Headers:**

* `Content-Type: application/json` or `Content-Type: text/markdown`

**Body (JSON):**

```json
{
  "markdown": "# My title\n\nMy markdown content..."
}
```

**Body (Text):**

```markdown
# My title

My markdown content...
```

**Response:**

```json
{
  "success": true,
  "data": {
    "nodes": [...],
    "metadata": {
      "version": 1,
      "createdTimestamp": "2025-11-06T...",
      "updatedTimestamp": "2025-11-06T..."
    },
    "documentStyle": {}
  }
}
```

#### `GET /`

Displays API information and available endpoints.

#### `GET /example`

Returns a sample Markdown → RICOS conversion.

### Request examples

**With curl (JSON):**

```bash
curl -X POST http://localhost:3000/convert \
  -H "Content-Type: application/json" \
  -d '{"markdown": "# Hello World\n\nThis is a **test**."}'
```

**With curl (Markdown):**

```bash
curl -X POST http://localhost:3000/convert \
  -H "Content-Type: text/markdown" \
  -d "# Hello World

This is a **test**."
```

## 📦 Supported Markdown elements

* ✅ Headings (H1 to H6)
* ✅ Paragraphs
* ✅ Bullet lists
* ✅ Ordered lists
* ✅ Blockquotes
* ✅ Code blocks
* ✅ Horizontal rules
* ✅ Images

## 🏗️ Project structure

```
wix-content-creator/
├── app.js              # Main Express application
├── package.json        # Project dependencies
├── Dockerfile          # Docker configuration
├── .dockerignore       # Files ignored by Docker
├── .gitignore          # Files ignored by Git
└── README.md           # This file
```

## 🛠️ Technologies used

* **Express.js** (v5.1.0) - Minimal web framework
* **marked** (v16.3.0) - Markdown parser
* **ricos-content** (v10.102.0) - RICOS types for Wix

## 📝 RICOS format

The RICOS (Rich Content Object Structure) format is the rich content structure used by Wix. It represents content as a node tree with metadata.

Basic structure:

```json
{
  "nodes": [
    {
      "type": "PARAGRAPH",
      "id": "unique-id",
      "nodes": [
        {
          "type": "TEXT",
          "id": "unique-id",
          "textData": {
            "text": "Text content",
            "decorations": []
          }
        }
      ]
    }
  ],
  "metadata": {
    "version": 1,
    "createdTimestamp": "ISO-8601",
    "updatedTimestamp": "ISO-8601"
  },
  "documentStyle": {}
}
```

## 🐛 Error handling

The API returns errors in the following format:

```json
{
  "error": "Error message",
  "details": "Technical details"
}
```

HTTP error codes:

* `400` - Invalid request (missing markdown)
* `500` - Server error (conversion failed)

## 📄 License

Personal project - Free to use

## 👤 Author

Adam

---

**Note:**
This project is a simple and minimal solution for converting Markdown to RICOS. For production use cases, consider adding stronger validation and more robust error handling.
