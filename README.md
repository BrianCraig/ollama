# ollama

A lightweight React + Vite chat UI for interacting with Ollama-style model backends. This repository provides a small, local-first web interface for conversations — built with Vite, React, and Tailwind. Inspired by WebUI.

**Try the full app:** https://briancraig.github.io/ollama/

**Features**
- **Local streaming conversations:** Fully local streaming conversations with LLMs via Ollama — privacy-first and low latency.
- **Editable conversations:** Modify the complete conversation: edit messages, change roles, and insert messages between existing ones.
- **Encrypted storage:** Locally encrypted conversations for improved privacy.
- **Offline support (WIP):** Use the app without internet.
- **Advanced parameters (WIP):** Tweak temperature, context size, and other model parameters.
- **Extremelly lightweight:** Around 300kb~ on production, 100kb~ gzipped.

**Local Installation**
- **Requirements:** Node.js (22+ recommended) and `npm`.
- Clone the repo:

```bash
git clone https://github.com/BrianCraig/ollama.git
cd ollama
```

- Install dependencies:

```bash
npm install
```

- Run in development mode (hot reload):

```bash
npm run dev
```

Open at `http://localhost:5173` (or the address shown by Vite).

**Deploy / Try online**
- A live demo is available at: `https://briancraig.github.io/ollama/`, make sure to run your local ollama with the following environment variable:
```
OLLAMA_ORIGINS="https://briancraig.github.io"
```


**Contributing**
- Contributions and issues are welcome. Open a PR or issue describing the change or bug.