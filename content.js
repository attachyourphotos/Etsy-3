// Initialize the AI response button
async function initializeAIButton() {
  const textarea = document.querySelector('textarea[name="message"], textarea.wt-textarea, textarea[id*="message"], textarea');
  const messageContainer = document.querySelector('p.wt-text-truncate.wt-text-black, .conversation-message, .message-content, [class*="message"], [class*="conversation"]');
  if (textarea && messageContainer && !document.getElementById('ai-response-btn')) {
    const button = document.createElement('button');
    button.id = 'ai-response-btn';
    button.innerText = 'Generate AI Response';
    button.className = 'ai-response-btn';
    button.style.margin = '10px';
    button.style.padding = '8px 16px';
    button.style.backgroundColor = '#F1641E';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';

    textarea.parentElement.appendChild(button);

    button.addEventListener('click', async () => {
      const message = await getReceivedMessage();
      if (message) {
        button.innerText = 'Generating...';
        button.disabled = true;
        try {
          const response = await generateAIResponse(message);
          insertResponse(response);
        } catch (error) {
          alert('Error generating response: ' + error.message);
        }
        button.innerText = 'Generate AI Response';
        button.disabled = false;
      } else {
        alert('No message found to respond to. Please select a conversation.');
      }
    });
  }
}

// Extract the latest received message
async function getReceivedMessage() {
  function trySelectors() {
    let messages = document.querySelectorAll('p.wt-text-truncate.wt-text-black, [data-test-id="unsanitize"]');
    if (messages.length === 0) {
      messages = document.querySelectorAll(
        '.conversation-message, .message-content, .wt-text-body, [class*="message"], [class*="wt-"], [class*="conversation"] p, [role="log"] p, [class*="wt-"] span, [data-testid*="message"], [data-test-id*="message"]'
      );
    }
    return messages;
  }

  let messages = trySelectors();
  if (messages.length === 0) {
    return new Promise((resolve) => {
      setTimeout(() => {
        messages = trySelectors();
        console.debug('Messages found after retry:', messages.length);
        if (messages.length > 0) {
          console.debug('Sample message texts:', Array.from(messages).slice(0, 3).map(m => m.innerText));
          resolve(messages[messages.length - 1].innerText || '');
        } else {
          console.error('No messages found after retry');
          resolve('');
        }
      }, 2000);
    });
  }

  console.debug('Messages found:', messages.length, 'Selectors tried:', [
    'p.wt-text-truncate.wt-text-black, [data-test-id="unsanitize"]',
    '.conversation-message, .message-content, .wt-text-body, [class*="message"], [class*="wt-"], [class*="conversation"] p, [role="log"] p, [class*="wt-"] span, [data-testid*="message"], [data-test-id*="message"]'
  ]);
  if (messages.length > 0) {
    console.debug('Sample message texts:', Array.from(messages).slice(0, 3).map(m => m.innerText));
  }
  return messages[messages.length - 1].innerText || '';
}

// Insert the AI-generated response into the textarea
function insertResponse(response) {
  const textarea = document.querySelector('textarea[name="message"], textarea.wt-textarea, textarea[id*="message"], textarea');
  if (textarea) {
    textarea.value = response;
    textarea.focus();
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// Communicate with background script to get AI response
async function generateAIResponse(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'generateResponse', message }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response.text[0]?.text || 'Sorry, no response generated.');
      }
    });
  });
}

// Run initialization when the page is fully loaded
document.addEventListener('DOMContentLoaded', initializeAIButton);
setTimeout(initializeAIButton, 2000); // Fallback for slow-loading pages