const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = 8000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// n8n webhook URL - Updated with your specific webhook
const N8N_WEBHOOK_URL = 'https://sythomind.app.n8n.cloud/webhook/chat';

// const N8N_WEBHOOK_URL = 'https://sythomind.app.n8n.cloud/webhook-test/chat';

// Store conversation context (in production, use a database)
const conversationContext = new Map();



// Routes
app.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId = 'default' } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Get or create conversation context
        let context = conversationContext.get(sessionId) || {
            history: [],
            userPreferences: {}
        };

        // Prepare comprehensive data for n8n webhook
        const n8nPayload = {
            message: message,
            sessionId: sessionId,
            context: {
                history: context.history,
                userPreferences: context.userPreferences
            },
            timestamp: new Date().toISOString()
        };

        // console.log('Sending to n8n:', JSON.stringify(n8nPayload, null, 2));

        // Send full context to n8n webhook
        const n8nResponse = await axios.post(N8N_WEBHOOK_URL, n8nPayload, {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 100000
        });

        // console.log('n8n response:', n8nResponse.data);

        // Extract response from n8n - handle different response formats
        let botReply;
        if (n8nResponse.data) {
            // Check various possible response formats from n8n
            botReply = n8nResponse.data.reply || 
                      n8nResponse.data.response || 
                      n8nResponse.data.output || 
                      n8nResponse.data.text ||
                      (typeof n8nResponse.data === 'string' ? n8nResponse.data : null);
        }
        
        // Fallback if no valid response found
        if (!botReply) {
            botReply = 'I received your message but need more context.';
        }

        // Update conversation context with the new exchange
        context.history.push({
            user: message,
            bot: botReply,
            timestamp: new Date().toISOString()
        });

        // Keep only last 10 messages in history
        if (context.history.length > 10) {
            context.history = context.history.slice(-10);
        }

        conversationContext.set(sessionId, context);

        res.json({
            reply: botReply,
            sessionId: sessionId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error processing chat message:', error);
        
        // Fallback responses for engineering admission queries
        const fallbackResponses = [
            "I'm having trouble accessing the admission database right now. Please try again in a moment.",
            "It seems I'm experiencing some technical difficulties. Could you please rephrase your admission-related question?",
            "I apologize, but I'm unable to fetch admission information at the moment. Please try again later or contact the admission office directly."
        ];
        
        const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
        
        res.json({
            reply: randomResponse,
            error: true
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Engineering Admission Chatbot API'
    });
});

// Get conversation history
app.get('/api/conversation/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const context = conversationContext.get(sessionId);
    
    if (!context) {
        return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json({
        sessionId,
        history: context.history,
        preferences: context.userPreferences
    });
});

// Clear conversation history
app.delete('/api/conversation/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    conversationContext.delete(sessionId);
    
    res.json({ 
        message: 'Conversation cleared successfully',
        sessionId 
    });
});



// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: 'Something went wrong on our end'
    });
});

// 404 handler
// app.use('*', (req, res) => {
//     res.status(404).json({ error: 'Endpoint not found' });
// });

app.listen(PORT, () => {
    console.log(`🎓 Engineering Admission Chatbot server running on port ${PORT}`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log(`❤️ API Health: http://localhost:${PORT}/api/health`);
});

module.exports = app;