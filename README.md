# Connect LLMs to your browser and teach them Skills

<table>
  <tbody>
    <tr>
      <td></td>
      <td></td>
      <td></td>
    </tr>
    <tr>
      <td>Summarize pages</td>
      <td>Fill out forms</td>
      <td>Recursive prompting</td>
    </tr>
  </tbody>
</table>

<br>
<br>
<br>

# Quickstart
<table>
  <tbody>
    <tr>
      <td></td>
      <td></td>
      <td></td>
    </tr>
    <tr>
      <td>Connecting to GPT4</td>
      <td>Teaching your GPTs Skills</td>
      <td>Keyboard shortcuts</td>
    </tr>
    <tr>
      <td></td>
      <td></td>
      <td></td>
    </tr>
    <tr>
      <td>Managing multiple connections</td>
      <td>Connecting to local models</td>
      <td>Roadmap</td>
    </tr>    
  </tbody>
</table>

<br>
<br>
<br>
<br>
<hr>
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
git clone https://github.com/singulat/gpt-scratchpad
cd gpt-scratchpad

# Install dependencies
npm install
```

<br>

  ## Step 2 - Sideload the extension
1. Visit `chrome://extensions` (even if you're on edge etc, your browser should automatically redirect)
2. Enable **Developer Mode**
3. Click **Load unpacked extension** and select the `gpt-scratchpad/dist` folder
4. Enable the GPT Scratchpad extension
5. Click on the GPT Scratchpad icon or press <kbd>CTRL+SHIFT+SPACE</kbd> to begin

### Visual guide: Edge Browser

<img width="906" alt="image" src="https://github.com/singulat/gpt-scratchpad/assets/151397270/7768ff80-5f03-43e8-9f5f-5b3924b1a4e9">

<br>
<br>
<br>
<br>
<hr>
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


## Markdown extensions
- [Markdown Attributes](https://github.com/arve0/markdown-it-attrs)
- [Mermaid](https://mermaid.js.org/intro/getting-started.html)
  - See here for extras: https://github.com/wekan/markdown-it-mermaid#readme

<br>
<br>
<br>
<br>
<hr>
<br>
<br>
<br>
<br>
