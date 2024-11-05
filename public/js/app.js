// Frontend JavaScript (public/js/app.js)

document.getElementById('configForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const zoomApiKey = document.getElementById('zoomApiKey').value;
  const geminiApiKey = document.getElementById('geminiApiKey').value;
  const geminiPrompt = document.getElementById('geminiPrompt').value;
  const geminiSettings = document.getElementById('geminiSettings').value;
  const telegramBotToken = document.getElementById('telegramBotToken').value;
  const telegramChatID = document.getElementById('telegramChatID').value;

  // Client-side validation
  if (!zoomApiKey.trim()) {
    document.getElementById('errorDisplay').innerText = 'Zoom API Key is required.';
    return;
  }
  if (!geminiApiKey.trim()) {
    document.getElementById('errorDisplay').innerText = 'Gemini API Key is required.';
    return;
  }
  if (!geminiPrompt.trim()) {
    document.getElementById('errorDisplay').innerText = 'Gemini Prompt is required.';
    return;
  }
  try {
    JSON.parse(geminiSettings);
  } catch (error) {
    document.getElementById('errorDisplay').innerText = 'Gemini Settings must be a valid JSON.';
    return;
  }
  if (!telegramBotToken.trim()) {
    document.getElementById('errorDisplay').innerText = 'Telegram Bot Token is required.';
    return;
  }
  if (!telegramChatID.trim()) {
    document.getElementById('errorDisplay').innerText = 'Telegram Chat ID is required.';
    return;
  }

  try {
    const response = await fetch('/set-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ zoomApiKey, geminiApiKey, prompt: geminiPrompt, geminiSettings: JSON.parse(geminiSettings), botToken: telegramBotToken, chatID: telegramChatID }),
    });

    const result = await response.json();
    if (result.error) {
      document.getElementById('errorDisplay').innerText = result.error;
    } else {
      alert('Settings saved successfully.');
    }
  } catch (error) {
    if (error.name === 'SyntaxError') {
      document.getElementById('errorDisplay').innerText = 'Invalid JSON format in Gemini settings. Please correct it and try again.';
    } else if (error.message.includes('NetworkError')) {
      document.getElementById('errorDisplay').innerText = 'Network error occurred while saving settings. Please check your connection and try again.';
    } else {
      document.getElementById('errorDisplay').innerText = 'An unexpected error occurred while saving settings. Please try again.';
    }
  }
});


// Note: The above setup includes compatibility for both Safari and Google Chrome, as it uses standard JavaScript, HTML, and CSS.