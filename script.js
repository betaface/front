document.addEventListener('DOMContentLoaded', () => {
    const messagesList = document.querySelector('.messages-list');
    const messageForm = document.querySelector('.message-form');
    const messageInput = document.querySelector('.message-input');
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    const typingIndicator = document.querySelector('.typing-indicator');
    const clearChatButton = document.getElementById('clearChat');
    const scrollToBottomButton = document.querySelector('.scroll-to-bottom');
    const themeSwitch = document.querySelector('#checkbox');
  
    const createMessageElement = (message, sender, isReceived) => {
      const messageItem = document.createElement('li');
      messageItem.classList.add('chat-box', isReceived ? 'received' : 'sent');
      messageItem.innerHTML = `
        <div class="chat-box-header">${sender}</div>
        <div class="chat-box-content">${formatMessage(message)}</div>`;
      return messageItem;
    };
  
    const formatMessage = (message) => {
      const paragraphs = message.split('\n\n');
      const formattedParagraphs = paragraphs.map(paragraph => {
        if (paragraph.includes('\n- ')) {
          const listItems = paragraph.split('\n- ');
          const formattedList = listItems.map((item, index) => 
            index === 0 ? item : `• ${item}`
          ).join('<br>');
          return formattedList;
        }
        return paragraph;
      });
      return formattedParagraphs.join('<br><br>');
    };
  
    const sendMessage = async (message) => {
      try {
        typingIndicator.style.display = 'block';
        const response = await fetch('', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            'csrfmiddlewaretoken': csrfToken,
            'message': message
          })
        });
        const data = await response.json();
        typingIndicator.style.display = 'none';
        return data.response;
      } catch (error) {
        console.error('Error sending message:', error);
        typingIndicator.style.display = 'none';
        return null;
      }
    };
  
    messageForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = messageInput.value.trim();
      if (message.length === 0) return;
  
      addMessageWithLazyLoading(createMessageElement(message, 'You', false));
      messageInput.value = '';
  
      if (navigator.onLine) {
        const response = await sendMessage(message);
        if (response) {
          setTimeout(() => {
            addMessageWithLazyLoading(createMessageElement(response, 'Nivan', true));
            scrollToBottom();
          }, 500);
        }
      } else {
        messageQueue.push(message);
        showErrorMessage('Message queued. It will be sent when you are back online.');
      }
  
      scrollToBottom();
    });
  
    clearChatButton.addEventListener('click', () => {
      messagesList.innerHTML = '';
      messagesList.appendChild(createMessageElement('Chat cleared. How can I assist you?', 'Nivan', true));
      scrollToBottom();
    });
  
    const scrollToBottom = () => {
      messagesList.scrollTop = messagesList.scrollHeight;
      scrollToBottomButton.style.display = 'none';
    };
  
    messagesList.addEventListener('scroll', () => {
      if (messagesList.scrollTop + messagesList.clientHeight < messagesList.scrollHeight - 100) {
        scrollToBottomButton.style.display = 'flex';
      } else {
        scrollToBottomButton.style.display = 'none';
      }
    });
  
    scrollToBottomButton.addEventListener('click', scrollToBottom);
  
    themeSwitch.addEventListener('change', function(e) {
      if (e.target.checked) {
        document.body.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
      } else {
        document.body.classList.remove('light-theme');
        localStorage.setItem('theme', 'dark');
      }    
    });
  
    const savedTheme = localStorage.getItem('theme');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
      themeSwitch.checked = true;
    } else if (savedTheme === 'dark') {
      document.body.classList.remove('light-theme');
      themeSwitch.checked = false;
    } else if (prefersDarkScheme.matches) {
      document.body.classList.remove('light-theme');
      themeSwitch.checked = false;
    } else {
      document.body.classList.add('light-theme');
      themeSwitch.checked = true;
    }
  
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
  
    const addMessageWithLazyLoading = (messageElement) => {
      messageElement.style.opacity = '0';
      messageElement.style.transform = 'translateY(20px)';
      messagesList.appendChild(messageElement);
      observer.observe(messageElement);
      
      messageElement.offsetHeight;
      
      messageElement.classList.add('visible');
    };
  
    const showErrorMessage = (message) => {
      const errorMessage = document.createElement('div');
      errorMessage.classList.add('error-message');
      errorMessage.textContent = message;
      messagesList.appendChild(errorMessage);
      scrollToBottom();
    };
  
    window.addEventListener('online', () => {
      showErrorMessage('You are back online. Reconnected to the server.');
    });
  
    window.addEventListener('offline', () => {
      showErrorMessage('You are offline. Please check your internet connection.');
    });
  
    let messageQueue = [];
  
    const processMessageQueue = async () => {
      while (messageQueue.length > 0) {
        const message = messageQueue.shift();
        try {
          const response = await sendMessage(message);
          if (response) {
            addMessageWithLazyLoading(createMessageElement(response, 'Nivan', true));
          }
        } catch (error) {
          console.error('Error processing queued message:', error);
          messageQueue.unshift(message);
          break;
        }
      }
    };
  
    setInterval(() => {
      if (navigator.onLine && messageQueue.length > 0) {
        processMessageQueue();
      }
    }, 5000);
  });