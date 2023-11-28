![ModelPrompter](https://github.com/0xozram/modelprompter/assets/151397270/e5441c2e-c6d0-4425-9ba6-e1c97ad26a6a)

### It's like ChatGPT but as a browser extension 🧚✨

| Chat from anywhere | Manage Channels | Manage LLM connections |
|-|-|-|
| ![](https://github.com/0xozram/modelprompter/assets/151397270/68ddf351-b9de-481e-821f-abb7494e5448) | ![](https://github.com/0xozram/modelprompter/assets/151397270/9296d533-5130-4a5a-a41e-d9cec4fc15b5) | ![](https://github.com/0xozram/modelprompter/assets/151397270/74876598-bc22-4a96-a43e-76b0fcc21098) |

<br>
<br>
<br>

# Key features (so far)
- Shortcuts for everything; no mouse needed
- Quickly change models & configurations
- Multiple channels with system prompts

<br>
<br>
<br>
<br>
<br>

# Roadmap
- [x] ~Basic chat features~ (11/25)
- [ ] Chat with page
- [ ] Interact with page (emulate mouse/keyboard)
- [ ] Autorun prompts based on URL, triggers, or conditions
- [ ] Autogen and MemGPT integration for running long browser processes
- [ ] 🥳 Publish MVP

<br>
<br>
<br>
<br>
<br>

# Install from source
> **Playstore coming soon:** I'll make it easier to setup later, but for now you'll need to build from source.

<br>

## Step 1 - Build the Browser Extension
### Requirements
- git - https://git-scm.com/downloads
- NodeJS - https://nodejs.org/en/download/

```bash
# Clone this project locally
git clone https://github.com/0xozram/modelprompter
cd modelprompter

# Install dependencies
npm install
```

<br>

## Step 2 - Sideload the extension
1. Visit `chrome://extensions` (even if you're on edge etc, your browser should automatically redirect)
2. Enable **Developer Mode**
3. Click **Load unpacked extension**
4. Enable ModelPrompter
5. Click on the ModelPrompter icon to begin

### Visual guide: Edge Browser
<img width="906" alt="image" src="https://github.com/0xozram/modelprompter/assets/151397270/7768ff80-5f03-43e8-9f5f-5b3924b1a4e9">

<br>
<br>
<br>
<br>
<br>

# Developing
This project comes with a live reload server, so you can write code without having to manually refresh anything. Sometimes it crashes spectacularly though. If you suddenly start getting strange errors and bugs while you're developing, try manually reloading the extension.

```bash
# Start a local dev server
npm start

# Stop the server
# CTRL+C
```
