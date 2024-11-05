import express from 'express';
import axios from 'axios';
import { Server } from 'socket.io';
import { createServer } from 'http';
import path from 'path';

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Serve the main interface
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const config = {
  zoomAPI: null,
  geminiAPI: null,
  geminiPrompt: null,
  geminiSettings: {},
  telegramBotToken: null,
  telegramChatID: null,
};

// Helper function to validate config values
function validateConfigValue(value, fieldName) {
  if (!value || typeof value !== 'string' || !value.trim()) {
    throw new Error(`Invalid ${fieldName} provided.`);
  }
}

// Helper function to parse and validate Gemini settings
function parseGeminiSettings(settings) {
  let parsedSettings;
  try {
    parsedSettings = JSON.parse(settings);
    if (typeof parsedSettings !== 'object' || Array.isArray(parsedSettings)) {
      throw new Error('Gemini settings must be a valid JSON object.');
    }
  } catch (error) {
    throw new Error('Invalid Gemini settings provided. Please enter valid JSON.');
  }
  return parsedSettings;
}

// Helper function to update configuration
function updateConfig({ zoomApiKey, geminiApiKey, prompt, parsedGeminiSettings, botToken, chatID }) {
  config.zoomAPI = zoomApiKey;
  config.geminiAPI = geminiApiKey;
  config.geminiPrompt = prompt;
  config.geminiSettings = parsedGeminiSettings;
  config.telegramBotToken = botToken;
  config.telegramChatID = chatID;
}

// Function to validate and parse user settings
function validateAndParseSettings(reqBody) {
  const { zoomApiKey, geminiApiKey, prompt, geminiSettings, botToken, chatID } = reqBody;
  validateConfigValue(zoomApiKey, 'Zoom API Key');
  validateConfigValue(geminiApiKey, 'Gemini API Key');
  validateConfigValue(prompt, 'Gemini prompt');
  validateConfigValue(botToken, 'Telegram Bot Token');
  validateConfigValue(chatID, 'Telegram Chat ID');
  const parsedGeminiSettings = parseGeminiSettings(geminiSettings);
  return { zoomApiKey, geminiApiKey, prompt, parsedGeminiSettings, botToken, chatID };
}

// API to save the user input settings
app.post('/set-config', (req, res) => {
  try {
    const validatedSettings = validateAndParseSettings(req.body);
    updateConfig(validatedSettings);
    res.json({ success: 'Settings saved successfully.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Function to handle Zoom transcription
async function fetchZoomTranscription(meetingId) {
  try {
    const response = await axios.get(`https://api.zoom.us/v2/meetings/${meetingId}/transcription`, {
      headers: {
        Authorization: `Bearer ${config.zoomAPI}`,
      },
    });
    if (response.status === 404) {
      throw new Error('Zoom meeting transcription not found (404).');
    } else if (response.status === 401) {
      throw new Error('Unauthorized access to Zoom API (401). Please check your API key.');
    }
    if (response.data && response.data.transcription) {
      const transcription = response.data.transcription;
      await processGeminiPrompt(transcription);
    } else {
      throw new Error('Transcription text not found in response.');
    }
  } catch (error) {
    console.error('Error fetching Zoom transcription:', error.message);
  }
}

// Function to process text with Gemini
async function processGeminiPrompt(transcription) {
  try {
    const response = await axios.post('https://api.gemini.com/process', {
      text: transcription,
      prompt: config.geminiPrompt,
      settings: config.geminiSettings,
    }, {
      headers: {
        Authorization: `Bearer ${config.geminiAPI}`,
      },
      timeout: 5000, // Adding timeout to prevent hanging indefinitely
    });
    if (response.data && response.data.result) {
      const result = response.data.result;
      await sendTelegramMessage(result);
    } else {
        


        throw new Error('Result not found in Gemini response.');
    }
  } catch (error) {
    console.error('Error processing with Gemini:', error.message);
    io.emit('error', 'An error occurred while processing the request. Please try again later.');
  }
}

// Function to send message via Telegram
async function sendTelegramMessage(message) {
  let attempts = 0;
  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds

  while (attempts < maxRetries) {
    try {
      const response = await axios.post(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
        chat_id: config.telegramChatID,
        text: message,
      });
      if (response.status === 200) {
        return; // Message sent successfully, exit the loop
      } else {
        throw new Error(`Unexpected response from Telegram API: ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      attempts++;
      console.error(`Attempt ${attempts} - Error sending message to Telegram:`, error.message);
      if (attempts >= maxRetries) {
        io.emit('error', 'An error occurred while sending a message. Please try again later.');
      } else {
        await new Promise(resolve => setTimeout(resolve, retryDelay)); // Wait before retrying
      }
    }
  }
}

// Error handling on the front end
io.on('connection', (socket) => {
  socket.on('error', (errorMessage) => {
    socket.emit('display-error', errorMessage);
  });
});

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});



