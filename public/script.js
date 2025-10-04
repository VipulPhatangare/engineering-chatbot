class ChatBot {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.apiBaseUrl = 'http://localhost:3000/api';
        this.userScrolled = false;
        
        this.init();
    }

    init() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Track user scrolling
        this.chatMessages.addEventListener('scroll', () => {
            const isAtBottom = this.chatMessages.scrollTop + this.chatMessages.clientHeight >= this.chatMessages.scrollHeight - 10;
            this.userScrolled = !isAtBottom;
        });
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        // Add user message to chat
        this.addMessage(message, 'user');
        this.messageInput.value = '';

        // Show typing indicator
        const typingIndicator = this.showTypingIndicator();

        try {
            const response = await this.getBotResponse(message);
            this.removeTypingIndicator(typingIndicator);
            this.addMessageWithTypewriter(response, 'bot');
        } catch (error) {
            this.removeTypingIndicator(typingIndicator);
            this.addMessage('Sorry, I encountered an error. Please try again.', 'bot');
            console.error('Error:', error);
        }
    }

    async getBotResponse(message) {
        const response = await fetch(`${this.apiBaseUrl}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        return data.reply;
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        const messageText = document.createElement('div');
        messageText.innerHTML = this.formatMessage(text);
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = this.getCurrentTime();
        
        messageContent.appendChild(messageText);
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageTime);
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addMessageWithTypewriter(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        const messageText = document.createElement('div');
        messageText.innerHTML = '';
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = this.getCurrentTime();
        
        messageContent.appendChild(messageText);
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageTime);
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();

        // Start typewriter effect with faster speed (15ms instead of 30ms)
        this.typeWriter(messageText, this.formatMessage(text), 0, 15);
    }

    typeWriter(element, text, index, speed) {
        if (index < text.length) {
            element.innerHTML = text.substring(0, index + 1) + '<span class="cursor">|</span>';
            // Only auto-scroll if user hasn't manually scrolled up
            if (!this.userScrolled) {
                this.scrollToBottom();
            }
            setTimeout(() => {
                this.typeWriter(element, text, index + 1, speed);
            }, speed);
        } else {
            // Remove cursor when typing is complete
            element.innerHTML = text;
            // Reset scroll detection after typing is complete
            this.userScrolled = false;
        }
    }

    formatMessage(text) {
        // Convert markdown-style formatting to HTML
        let formatted = text
            // Convert **bold** to <strong>
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Convert *italic* to <em>
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Convert bullet points to proper list items
            .replace(/^\*\s+(.+)$/gm, '<li>$1</li>')
            // Convert line breaks to <br>
            .replace(/\n/g, '<br>');

        // Wrap list items in <ul> tags
        if (formatted.includes('<li>')) {
            formatted = formatted.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
            // Clean up multiple <ul> tags
            formatted = formatted.replace(/<\/ul>\s*<ul>/g, '');
        }

        return formatted;
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message typing-indicator';
        typingDiv.id = 'typing-indicator';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        const typingText = document.createElement('p');
        typingText.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
        
        messageContent.appendChild(typingText);
        typingDiv.appendChild(messageContent);
        
        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
        
        return typingDiv;
    }

    removeTypingIndicator(typingElement) {
        if (typingElement && typingElement.parentNode) {
            typingElement.parentNode.removeChild(typingElement);
        }
    }

    getCurrentTime() {
        return new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        // Reset scroll detection when we programmatically scroll to bottom
        this.userScrolled = false;
    }
}

// Initialize chatbot when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChatBot();
});

// Add typing animation CSS
const style = document.createElement('style');
style.textContent = `
    .typing-indicator .message-content {
        background: white;
        border: 1px solid #e2e8f0;
        border-bottom-left-radius: 4px;
    }
    
    .typing-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #64748b;
        margin: 0 2px;
        animation: typing-bounce 1.4s infinite ease-in-out;
    }
    
    .typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .typing-dot:nth-child(2) { animation-delay: -0.16s; }
    
    @keyframes typing-bounce {
        0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
        40% { transform: scale(1); opacity: 1; }
    }
`;
document.head.appendChild(style);