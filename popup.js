document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
  const fetchMessageBtn = document.getElementById('fetchMessageBtn');
  const latestMessage = document.getElementById('latestMessage');
  const responseList = document.getElementById('responseList');
  const status = document.getElementById('status');
  const gearIcon = document.querySelector('.gear-icon');
  const apiSettings = document.querySelector('.api-settings');

  // Load saved API key
  chrome.storage.local.get(['apiKey'], (result) => {
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
      status.innerText = 'API key loaded. Ready to use!';
      status.style.color = 'green';
    }
  });

  // Toggle API settings visibility
  gearIcon.addEventListener('click', () => {
    apiSettings.style.display = apiSettings.style.display === 'none' ? 'block' : 'none';
  });

  // Save API key
  saveApiKeyBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.local.set({ apiKey }, () => {
        status.innerText = 'API key saved successfully!';
        status.style.color = 'green';
        setTimeout(() => {
          status.innerText = 'API key loaded. Ready to use!';
        }, 2000);
      });
    } else {
      status.innerText = 'Please enter a valid API key.';
      status.style.color = 'red';
    }
  });

  // Fetch latest message and generate responses
  fetchMessageBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        status.innerText = 'No active tab found. Please try again.';
        status.style.color = 'red';
        console.error('No active tab detected');
        return;
      }

      const tabUrl = tabs[0].url.toLowerCase();
      console.log('Active tab URL:', tabUrl);

      if (!tabUrl.includes('etsy.com') || !tabUrl.includes('/messages')) {
        status.innerText = 'Please open an Etsy Messages page to fetch a message. Current URL: ' + tabUrl;
        status.style.color = 'red';
        console.error('URL does not match Etsy Messages:', tabUrl);
        return;
      }

      function fetchMessageWithRetry(attempts = 6, delay = 3000) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            let messages = document.querySelectorAll('p.wt-text-truncate.wt-text-black');
            if (messages.length === 0) {
              messages = document.querySelectorAll(
                '[data-test-id="unsanitize"], .conversation-message, .message-content, .wt-text-body, [class*="message"], [class*="wt-"], [class*="conversation"] p, [role="log"] p'
              );
            }
            console.log('Messages found:', messages.length, 'Selectors tried:', [
              'p.wt-text-truncate.wt-text-black',
              '[data-test-id="unsanitize"], .conversation-message, .message-content, .wt-text-body, [class*="message"], [class*="wt-"], [class*="conversation"] p, [role="log"] p'
            ]);
            if (messages.length > 0) {
              console.log('Sample message texts:', Array.from(messages).slice(0, 3).map(m => m.innerText));
            }
            return messages.length > 0 ? messages[messages.length - 1].innerText : '';
          }
        }, (results) => {
          if (chrome.runtime.lastError) {
            status.innerText = 'Error accessing page: ' + chrome.runtime.lastError.message;
            status.style.color = 'red';
            console.error('Script execution error:', chrome.runtime.lastError);
            return;
          }

          if (results[0].result) {
            const message = results[0].result;
            latestMessage.innerText = message;
            generateAIResponses(message, tabs[0].id);
          } else if (attempts > 1) {
            console.log('No messages found, retrying... Attempts left:', attempts - 1);
            setTimeout(() => fetchMessageWithRetry(attempts - 1, delay), delay);
          } else {
            status.innerText = 'No message found. Please ensure a conversation is selected in Etsy Messages.';
            status.style.color = 'red';
            console.error('No message found after retries');
          }
        });
      }

      fetchMessageWithRetry();
    });
  });

  // Generate AI responses
  function generateAIResponses(message, tabId) {
    responseList.innerHTML = '<p>Generating responses...</p>';
    chrome.runtime.sendMessage({ action: 'generateResponse', message }, (response) => {
      console.log('Received response from background:', response);
      if (response.error) {
        responseList.innerHTML = '';
        status.innerText = `Error: ${response.error}`;
        status.style.color = 'red';
        console.error('AI response error:', response.error);
        return;
      }
      responseList.innerHTML = '';
      if (!Array.isArray(response.text)) {
        responseList.innerHTML = '';
        status.innerText = 'Invalid response format from AI. Please try again or check your API key.';
        status.style.color = 'red';
        console.error('Expected an array of responses, got:', response.text);
        return;
      }
      response.text.forEach((resp, index) => {
        if (!resp || typeof resp.text !== 'string' || resp.text.includes('Failed to generate response')) {
          console.warn('Invalid or failed response at index', index, ':', resp);
          resp = { text: 'Could not generate response. Please try again or check your API key.', isExactMatch: false };
        }
        const div = document.createElement('div');
        div.className = 'response-item';
        div.innerHTML = `
          <p><strong>Option ${index + 1}</strong>${resp.isExactMatch ? ' <span class="exact-match-tag">Match</span>' : ''}</p>
          <div class="response-container">
            <p class="response-text" data-index="${index}">${resp.text}</p>
            <span class="copy-overlay" data-index="${index}" data-response="${resp.text.replace(/"/g, '&quot;')}">Copy</span>
          </div>
        `;
        responseList.appendChild(div);
      });

      // Handle copy overlay click
      document.querySelectorAll('.copy-overlay').forEach((overlay) => {
        overlay.addEventListener('click', () => {
          const index = overlay.getAttribute('data-index');
          const responseText = overlay.getAttribute('data-response');
          navigator.clipboard.writeText(responseText).then(() => {
            status.innerText = 'Response copied to clipboard!';
            status.style.color = 'green';
            setTimeout(() => (status.innerText = ''), 2000);

            // Forward to the Etsy message
            chrome.scripting.executeScript({
              target: { tabId: tabId },
              func: (fetchedMessage, copiedResponse) => {
                if (!window.location.href.includes('/messages') || window.location.href.includes('/messages/')) {
                  console.error('Not on main Messages page:', window.location.href);
                  return 'Not on main Messages page';
                }

                const selector = '.wt-grid.wt-text-link-no-underline';
                const conversationItems = document.querySelectorAll(selector);

                const allItems = Array.from(conversationItems).map(item => {
                  const preview = item.querySelector('p.wt-text-truncate.wt-text-black, [data-test-id="unsanitize"]');
                  return {
                    classes: item.className,
                    previewText: preview ? preview.innerText : 'No preview',
                    innerHTML: item.innerHTML.substring(0, 100)
                  };
                });
                console.log('All conversation items:', allItems);

                let targetItem = null;
                for (const item of conversationItems) {
                  const preview = item.querySelector('p.wt-text-truncate.wt-text-black, [data-test-id="unsanitize"]');
                  if (preview && preview.innerText.includes(fetchedMessage.substring(0, 50))) {
                    targetItem = item;
                    break;
                  }
                }

                if (!targetItem && conversationItems.length > 0) {
                  targetItem = conversationItems[0];
                  console.log('No exact match found, using first conversation item');
                }

                if (targetItem) {
                  console.log('Found conversation item:', {
                    classes: targetItem.className,
                    previewText: targetItem.querySelector('p.wt-text-truncate.wt-text-black, [data-test-id="unsanitize"]')?.innerText
                  });
                  targetItem.click();

                  setTimeout(() => {
                    const textareaSelectors = [
                      'textarea.wt-textarea',
                      'textarea[id*="message"]',
                      'textarea[class*="message"]',
                      'textarea'
                    ];
                    let textarea = null;
                    for (const selector of textareaSelectors) {
                      textarea = document.querySelector(selector);
                      if (textarea) break;
                    }
                    if (textarea) {
                      textarea.scrollIntoView({ behavior: 'smooth', block: 'end' });
                      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                      textarea.focus();
                      textarea.value = copiedResponse;
                      console.log('Focused textarea and pasted response:', textarea.id || textarea.className);
                      return 'Navigated, scrolled, and pasted';
                    } else {
                      console.error('No textarea found with selectors:', textareaSelectors);
                      return 'No textarea found';
                    }
                  }, 2000);
                  return 'Navigated to conversation';
                } else {
                  console.error('No conversation item found with selector:', selector);
                  return 'No conversation item found';
                }
              },
              args: [message, responseText]
            }, (results) => {
              if (chrome.runtime.lastError) {
                status.innerText = 'Error navigating to message: ' + chrome.runtime.lastError.message;
                status.style.color = 'red';
                console.error('Navigation error:', chrome.runtime.lastError);
              } else if (results[0].result === 'No conversation item found') {
                status.innerText = 'Could not find a conversation item. Please ensure you’re on the main Etsy Messages page.';
                status.style.color = 'red';
                console.error('No conversation item found');
              } else if (results[0].result === 'Not on main Messages page') {
                status.innerText = 'Please navigate to the main Etsy Messages page to open a conversation.';
                status.style.color = 'red';
                console.error('Not on main Messages page');
              } else if (results[0].result === 'No textarea found') {
                status.innerText = 'Navigated to message, but could not find the response field.';
                status.style.color = 'red';
                console.error('No textarea found');
              } else {
                console.log('Navigated successfully:', results[0].result);
              }
            });
          }).catch((err) => {
            status.innerText = 'Failed to copy: ' + err.message;
            status.style.color = 'red';
            console.error('Clipboard error:', err);
          });
        });
      });
    });
  }
});