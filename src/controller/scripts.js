import DOMPurify from 'dompurify'
import MarkdownIt from 'markdown-it'
import MarkdownItAttrs from 'markdown-it-attrs'
import shellParser from 'shell-quote/parse'

// Markdown
const md = new MarkdownIt({
  html: true,
})
md.use(MarkdownItAttrs)

export default {
  /**
   * Scan and run scripts
   */
  async scanAndRunScripts (response) {
    let text = DOMPurify.sanitize(md.render(response.combinedMessage), {
      ALLOWED_TAGS: ['code'],
      ALLOWED_ATTR: ['class']
    })
    md.render(text)

    // Parse the response and extract all <code class="language-gpt">...</code>
    // @fixme we should probably use virtual dom for this 😬
    const $scriptsContainer = document.createElement('div')
    $scriptsContainer.innerHTML = text
    const $scripts = $scriptsContainer.querySelectorAll('code.language-gpt')

    for (const $script of Array.from($scripts)) {
      const script = $script.innerText
      // Split the script into lines
      const scripts = script?.split('\n')
      const vars = {}
      for (let script of scripts) {
        if (!script.trim()) continue
        script = shellParser(script.trim())
        
        // Send to background script to be processed
        console.log('📜 Running script:', JSON.stringify(script))
        let completion = {}
        try {
          completion = await (async ()=> new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
              type: 'runGPTScript',
              tabID: globalThis.mp.tabID,
              script,
            }, response => {
              if (response.error) {
                reject(response.error)
              } else {
                resolve(response)
              }
            })
          }))()
        } catch (err) {
          // @todo We need a notification system
          continue
        }

        /**
         * Respond to Functions
         * @see contentscript.js
         */
        switch (script[0]) {
          // [1] variable name to store in
          case 'getPageText':
            vars[script[1]] = DOMPurify.sanitize(completion.text)
          break
          // [1] variable name to store in
          case 'getPageDOM':
            vars[script[1]] = completion.dom
            await this.messagesModel.addMessage(Object.assign({
              channel: this.activeChannel,
              role: 'user',
              text: completion.dom,
              rel: 'output',
              skip: true,
              collapsed: !script?.[2]?.includes('--expand'),
            }, {}))            
          break

          // [1] variable name to output
          case 'output':
            await this.messagesModel.addMessage(Object.assign({
              channel: this.activeChannel,
              role: 'user',
              text: vars[script[1]],
              rel: 'output',
              collapsed: !script?.[2]?.includes('--expand'),
            }, {}))
          break

          // [1] The message to prompt
          case 'prompt':
            await this.messagesModel.addMessage(Object.assign({
              channel: this.activeChannel,
              role: 'user',
              text: script[1],
              rel: 'prompt',
              collapsed: !script?.[2]?.includes('--expand'),
            }, {}))

            const messages = await this.messagesModel.getPreparedMessages(this.activeChannel)
            const response = await this.sendToLLM({
              messages,
              channel: this.activeChannel,
              defaults: {text: '🤔 Thinking...', role: 'placeholder'}
            })
            this.removePlaceholders([response.placeholders])
          break
        }
      }
    }
  }
}