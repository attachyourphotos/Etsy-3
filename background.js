const API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

// Validate API key
async function validateApiKey(apiKey) {
  try {
    const response = await fetchWithRetry('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://your-app-url.com',
        'X-Title': 'Etsy AI Message Responder'
      }
    });
    return response.ok;
  } catch (error) {
    console.error('API key validation failed:', error);
    return false;
  }
}

// Handle messages from content or popup scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateResponse') {
    chrome.storage.local.get(['apiKey'], async (result) => {
      const apiKey = result.apiKey;
      if (!apiKey) {
        sendResponse({ error: 'No API key found. Please save your OpenRouter API key in the extension popup.' });
        return;
      }
      const isValidKey = await validateApiKey(apiKey);
      if (!isValidKey) {
        sendResponse({ error: 'Invalid API key. Please check and update your OpenRouter API key in the popup.' });
        return;
      }
      try {
        const responses = await generateAIResponses(request.message, apiKey);
        sendResponse({ text: responses });
      } catch (error) {
        console.error('Generate AI responses error:', error);
        sendResponse({ error: `Failed to generate responses: ${error.message}` });
      }
    });
    return true; // Keep message channel open for async response
  } else {
    sendResponse({ error: 'Unknown action' });
  }
});

// Fuzzy matching function (cosine similarity on word overlap)
function calculateSimilarity(str1, str2) {
  const words1 = str1.toLowerCase().split(/\s+/).filter(w => w);
  const words2 = str2.toLowerCase().split(/\s+/).filter(w => w);
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

// Keyword-based matching
function hasKeyTerms(message, terms) {
  const lowerMessage = message.toLowerCase();
  return terms.every(term => lowerMessage.includes(term.toLowerCase()));
}

// Retry-enabled fetch
async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429) {
        console.warn(`Rate limit hit, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      console.warn(`Fetch failed, retrying in ${delay}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  throw new Error('Max retries reached');
}

// Extract key terms to filter from the message
function getMessageKeyTerms(message) {
  const words = message.toLowerCase().split(/\s+/).filter(w => w.length > 3); // Filter short words
  const specificTerms = words.filter(w => /\d/.test(w) || w.match(/^[a-z]+$/)); // Numbers or pure words
  return specificTerms; // e.g., ["24x36", "uk"]
}

async function generateAIResponses(message, apiKey) {
  try {
    // Sample message history
    const messageHistory = [
      {
        customerMessage: "Are you able to print this on a 24x36?",
        response: "Hi! Unfortunately, the largest we offer for this print is 13x19. Thanks so much for the interest! 😊😊",
        intent: "customization_request",
        keyTerms: ["print", "size"]
      },
      {
        customerMessage: "Can you make a custom size for the poster?",
        response: "Hi! Yes, we can create custom sizes. Please let me know the dimensions you need, and I’ll get you a quote. Best, [Your Shop Name]",
        intent: "customization_request",
        keyTerms: ["custom", "size", "poster"]
      },
      {
        customerMessage: "How long will shipping take to the UK?",
        response: "Hello! Shipping to the UK typically takes 5–7 business days. I’ll provide tracking once your order ships. Thanks, [Your Shop Name]",
        intent: "shipping_inquiry",
        keyTerms: ["shipping", "UK"]
      }
    ];

    // Step 1: Check for exact or near-exact match
    const SIMILARITY_THRESHOLD = 0.8;
    const exactMatch = messageHistory.find(
      entry => entry.customerMessage.trim().toLowerCase() === message.trim().toLowerCase()
    );
    if (exactMatch) {
      console.debug('Exact match found:', exactMatch);
      const variations = await generateVariations(exactMatch.response, exactMatch.intent, apiKey, message);
      const responses = [
        { text: exactMatch.response, isExactMatch: true },
        ...variations
      ].slice(0, 3); // Ensure exactly 3 responses
      console.debug('Final responses:', responses);
      return responses;
    }

    const nearMatch = messageHistory.find(
      entry => calculateSimilarity(entry.customerMessage, message) >= SIMILARITY_THRESHOLD
    );
    if (nearMatch) {
      console.debug('Near match found:', nearMatch);
      const variations = await generateVariations(nearMatch.response, nearMatch.intent, apiKey, message);
      const responses = [
        { text: nearMatch.response, isExactMatch: false },
        ...variations
      ].slice(0, 3);
      console.debug('Final responses:', responses);
      return responses;
    }

    // Step 2: Check for key term match
    const keyTermMatch = messageHistory.find(
      entry => hasKeyTerms(message, entry.keyTerms)
    );
    if (keyTermMatch) {
      console.debug('Key term match found:', keyTermMatch);
      const variations = await generateVariations(keyTermMatch.response, keyTermMatch.intent, apiKey, message);
      const responses = [
        { text: keyTermMatch.response, isExactMatch: false },
        ...variations
      ].slice(0, 3);
      console.debug('Final responses:', responses);
      return responses;
    }

    // Step 3: Analyze message intent
    const intentPrompt = `Analyze the following customer message and identify its primary intent. Choose one intent from: "shipping_update", "shipping_inquiry", "customization_request", "order_status", "returns", "other". Focus on key phrases (e.g., "delay" and "ship" for shipping updates) to generalize intent across minor wording changes. Return only the intent as a string, no extra text.\n\nMessage: "${message}"`;
    console.debug('Intent prompt:', intentPrompt);

    const intentResponse = await fetchWithRetry(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://your-app-url.com',
        'X-Title': 'Etsy AI Message Responder'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [
          { role: 'system', content: intentPrompt },
          { role: 'user', content: 'Identify the intent' }
        ],
        max_tokens: 50
      })
    });

    if (!intentResponse.ok) {
      const errorText = await intentResponse.text();
      console.error('Intent API error:', intentResponse.status, errorText);
      return await generateFallbackResponses(message, messageHistory, apiKey);
    }

    const intentData = await intentResponse.json();
    const intent = intentData.choices[0]?.message?.content?.trim() || 'other';
    console.debug('Detected intent:', intent);

    // Step 4: Find history entry with matching intent
    const intentMatch = messageHistory.find(entry => entry.intent === intent);
    if (intentMatch) {
      console.debug('Intent match found:', intentMatch);
      const variations = await generateVariations(intentMatch.response, intentMatch.intent, apiKey, message);
      const responses = [
        { text: intentMatch.response, isExactMatch: false },
        ...variations
      ].slice(0, 3);
      console.debug('Final responses:', responses);
      return responses;
    }

    return await generateFallbackResponses(message, messageHistory, apiKey);
  } catch (error) {
    console.error('generateAIResponses error:', error);
    return await generateFallbackResponses(message, messageHistory, apiKey);
  }
}

// Generate variations for matched responses
async function generateVariations(responseText, intent, apiKey, message) {
  const variationPrompt = `You are an Etsy seller assistant. Generate exactly two distinct response variations based on the following response: "${responseText}". The variations must:
- Maintain the same friendly, professional tone.
- Address the general topic of the query (e.g., print size for customization requests, delivery time for shipping inquiries) without mentioning specific details from the customer's message (e.g., avoid terms like "24x36" or "UK").
- Differ meaningfully from the original response and each other.
- Output a JSON array of two strings (e.g., ["Variation 1", "Variation 2"]). Return only the JSON array, no Markdown, code blocks, or extra text.
The intent of the query is: "${intent}".`;
  console.debug('Variation prompt:', variationPrompt);

  try {
    const variationResponse = await fetchWithRetry(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://your-app-url.com',
        'X-Title': 'Etsy AI Message Responder'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [
          { role: 'system', content: variationPrompt },
          { role: 'user', content: `Generate two distinct variations for: "${responseText}" based on intent: "${intent}"` }
        ],
        max_tokens: 200
      })
    });

    if (!variationResponse.ok) {
      const errorText = await variationResponse.text();
      console.error('Variations API error:', variationResponse.status, errorText);
      throw new Error(`API error: ${variationResponse.status} ${errorText}`);
    }

    const variationData = await variationResponse.json();
    let content = variationData.choices[0]?.message?.content?.trim();
    if (!content) {
      console.error('No content in API response:', variationData);
      throw new Error('Empty response from API');
    }

    // Remove any Markdown or code block markers
    content = content.replace(/```json\n|\n```|```/g, '').trim();
    console.debug('Raw variation content:', content);

    let variations;
    try {
      variations = JSON.parse(content);
      if (!Array.isArray(variations) || variations.length < 1 || variations.some(v => typeof v !== 'string' || v.length < 20)) {
        throw new Error('Invalid variation format: Expected an array of non-empty strings');
      }
      // Filter out responses that include message-specific terms
      const messageTerms = getMessageKeyTerms(message);
      variations = variations
        .filter(v => {
          const lowerV = v.toLowerCase();
          return (
            !messageTerms.some(term => lowerV.includes(term.toLowerCase())) &&
            v !== responseText &&
            v.trim().length > 20
          );
        })
        .slice(0, 2);
    } catch (parseError) {
      console.error('Parsing variations failed:', parseError, 'Raw content:', content);
      // Fallback: Split content into sentences and filter valid, unique responses
      const messageTerms = getMessageKeyTerms(message);
      variations = content
        .split(/[.!?]\s+/)
        .map(line => line.trim().replace(/^"|"$/g, ''))
        .filter(line => {
          const lowerLine = line.toLowerCase();
          return (
            line &&
            line.length > 20 &&
            !messageTerms.some(term => lowerLine.includes(term.toLowerCase())) &&
            line !== responseText
          );
        })
        .slice(0, 2);
    }

    // If fewer than two variations, generate local variations
    if (variations.length < 2) {
      console.warn('Insufficient variations, generating local fallbacks');
      const localVariations = generateLocalVariations(responseText, intent);
      variations = variations.concat(localVariations).slice(0, 2);
    }

    // Ensure exactly two variations
    while (variations.length < 2) {
      variations.push(generateLocalVariations(responseText, intent)[variations.length] || 'Thanks for your message! I’ll get back to you soon.');
    }

    return variations.map(text => ({ text, isExactMatch: false }));
  } catch (error) {
    console.error('Variation generation failed:', error);
    // Return local variations as fallback
    const localVariations = generateLocalVariations(responseText, intent);
    return localVariations.slice(0, 2).map(text => ({ text, isExactMatch: false }));
  }
}

// Generate local variations as a fallback
function generateLocalVariations(responseText, intent) {
  const variations = [];
  // Simple rephrasing based on intent, without specific message details
  if (intent === 'customization_request') {
    variations.push(
      'Hello! Our standard prints go up to 13x19, but I can look into other options for you.',
      'Hi there! We offer sizes up to 13x19, and I’m happy to explore custom possibilities!'
    );
  } else if (intent === 'shipping_inquiry') {
    variations.push(
      'Hi! Delivery typically takes 5-7 business days, with tracking provided once shipped.',
      'Hello! Expect your order to arrive in about 5-7 business days, and I’ll send tracking details!'
    );
  } else {
    variations.push(
      'Thanks for reaching out! I’ll get back to you with more details soon.',
      'Hi! I appreciate your question and will respond with more info shortly.'
    );
  }
  return variations.filter(v => v !== responseText).slice(0, 2);
}

// Fallback response generation
async function generateFallbackResponses(message, messageHistory, apiKey) {
  const examplePrompt = messageHistory
    .map(
      (entry, index) =>
        `Example ${index + 1} (Intent: ${entry.intent}):\nCustomer: "${entry.customerMessage}"\nResponse: "${entry.response}"`
    )
    .join('\n\n');
  const systemPrompt = `You are an Etsy seller assistant. Generate exactly three distinct response options for a customer query. Each response must be concise, friendly, professional, align with Etsy’s standards, and address the general topic of the query (e.g., print size, shipping time) without mentioning specific details from the customer's message (e.g., avoid terms like "24x36" or "UK"). Output a JSON array of three strings (e.g., ["Response 1", "Response 2", "Response 3"]). Return only the JSON array, no Markdown, code blocks, or extra text. Match the tone and style of the following examples:\n\n${examplePrompt}`;
  console.debug('Fallback prompt:', systemPrompt);

  try {
    const response = await fetchWithRetry(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://your-app-url.com',
        'X-Title': 'Etsy AI Message Responder'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate three response options for a customer query` }
        ],
        max_tokens: 300
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Fallback API error:', response.status, errorText);
      throw new Error(`API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    let content = data.choices[0]?.message?.content?.trim();
    if (!content) {
      console.error('No content in API response:', data);
      throw new Error('Empty response from API');
    }

    content = content.replace(/```json\n|\n```|```/g, '').trim();
    console.debug('Raw fallback content:', content);

    let responses;
    try {
      responses = JSON.parse(content);
      if (!Array.isArray(responses) || responses.length < 1 || responses.some(r => typeof r !== 'string' || r.length < 20)) {
        throw new Error('Invalid response format: Expected an array of non-empty strings');
      }
      // Filter out responses that include message-specific terms
      const messageTerms = getMessageKeyTerms(message);
      responses = responses
        .filter(r => {
          const lowerR = r.toLowerCase();
          return !messageTerms.some(term => lowerR.includes(term.toLowerCase())) && r.trim().length > 20;
        })
        .slice(0, 3);
    } catch (parseError) {
      console.error('Parsing fallback failed:', parseError, 'Raw content:', content);
      const messageTerms = getMessageKeyTerms(message);
      responses = content
        .split(/[.!?]\s+/)
        .map(line => line.trim().replace(/^"|"$/g, ''))
        .filter(line => {
          const lowerLine = line.toLowerCase();
          return line && line.length > 20 && !messageTerms.some(term => lowerLine.includes(term.toLowerCase()));
        })
        .slice(0, 3);
      if (responses.length === 0) {
        responses = generateLocalVariations('', 'other').slice(0, 3);
      }
    }

    // Ensure exactly three responses
    while (responses.length < 3) {
      responses.push(generateLocalVariations('', 'other')[responses.length] || 'Thanks for your message! I’ll get back to you soon.');
    }

    return responses.map(text => ({ text, isExactMatch: false }));
  } catch (error) {
    console.error('Fallback generation failed:', error);
    return generateLocalVariations('', 'other')
      .concat(['Thanks for your message! I’ll get back to you soon.'])
      .slice(0, 3)
      .map(text => ({ text, isExactMatch: false }));
  }
}