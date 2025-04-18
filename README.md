# Autonoma

A **Multi-Agent AI Assistant System** that lets you automate complex computational workflows via a simple chat or voice interface over your local network. Built with a Python backend orchestrated by LangChain + LangGraph and a Next.js frontend, Autonoma empowers you to run tasks such as web scraping, scripting, file management, and full desktop automation—all within a secure, LAN-only environment.

## 🚀 Features

- **Chat & Voice Interface**: Interact via text or speech in English and Arabic.
- **Multi-Agent Orchestration**: Coordinator, Planner, Supervisor, Researcher, Coder, Browser, File Manager, Computer, Reporter.
- **Real‐Time Transparency**: Live activity stream, error reports, partial results.
- **LAN‐Only Security**: All traffic confined to your local network, sandboxed agents, full audit trails.
- **Extensible**: Easily add new agents or custom hooks.

## 📋 Prerequisites

- Python 3.9 or higher
- Node.js 16+ (for frontend build)
- pnpm (for agent-web dependencies)

## 🔧 Installation & Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/eslam-reda-div/Autonoma.git
   cd autonoma
   ```

2. **Install Python dependencies**

   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**

   - Copy and edit backend `.env`
     ```bash
     cp .env.example .env
     ```
   - In `.env`, set:

- `CHROME_INSTANCE_PATH` → path to Chrome executable, e.g., "C:\Program Files\Google\Chrome\Application\chrome.exe"
- `OPENWEATHERMAP_API_KEY` → your OpenWeatherMap API key
- `FIRECRAWL_API_KEY` → your Firecrawl API key
- `SERPER_API_KEY` → your Serper API key
- `TAVILY_API_KEY` → your Tavily API key
- `JINA_API_KEY` → your Jina API key
- `HYPERBROWSER_API_KEY` → your HyperBrowser API key
- `RIZA_API_KEY` → your Riza API key

4. **Configure credentials file**

   ```bash
   cp credentials-example.json credentials.json
   ```

   - Open `credentials.json` and fill in any model-specific tokens or service credentials as needed the gpt-4o models use a github access token and to use the model from the github api if you want to use the official openai api then use the openai api key but change the MODEL\_BASE\_URL var in the env to the main openai base url, and the gemini models use a gemini api access token.

5. **Build the frontend (agent-web)**

   ```bash
   cd agent-web
   cp .env.example .env
   pnpm install
   pnpm build
   cd ..
   ```

## ▶️ Usage

1. **Start the backend orchestrator**
   ```bash
   python user.py
   ```
2. **Scan the QR code** displayed in your terminal or browser to connect your mobile/web client.
3. **Interact** with Autonoma via chat or voice—ask it to scrape data, run scripts, manage files, or automate desktop tasks.

## 🤝 Contributing

Contributions are welcome! Please open issues or pull requests to add new agents, improve documentation, or enhance functionality.
