const messageForm = document.querySelector(".prompt__form");
const chatHistoryContainer = document.querySelector(".chats");
const suggestionItems = document.querySelectorAll(".suggests__item");

const themeToggleButton = document.getElementById("themeToggler");
const clearChatButton = document.getElementById("deleteButton");

// State variables
let currentUserMessage = null;
let isGeneratingResponse = false;

const GOOGLE_API_KEY = "AIzaSyD9hGLk0-FiAaCBJYQgcfUoAG2cMij1rxg";
const API_REQUEST_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`;

const dailyTipContent = document.querySelector('.daily-tip__content');
const DAILY_TIPS = [
    "Breathe in calm, breathe out tension.",
    "You are exactly where you need to be.",
    "Let your thoughts drift by like clouds.",
    "Peace begins with a single breath.",
    "You are enough, just as you are.",
    "Let go of what you can't control.",
    "Be gentle with yourself today.",
    "Every moment is a fresh beginning.",
    "Gratitude turns what we have into enough.",
    "Your mind is a garden—nourish it with positivity."
];

const MEDITATION_SYSTEM_PROMPT = "You are a meditation coach. Only answer questions about meditation, mindfulness, relaxation, and well-being. If the user asks about something else, gently guide them back to meditation topics.";

// --- Multi-Chat Storage and Sidebar ---
const chatHistorySidebar = document.getElementById('chatHistorySidebar');
const newChatButton = document.getElementById('newChatButton');

let allChats = JSON.parse(localStorage.getItem('all-meditation-chats')) || [];
let currentChatId = null;

function createNewChat() {
    const id = 'chat-' + Date.now();
    const chat = {
        id,
        title: 'New Chat',
        created: new Date().toLocaleString(),
        messages: []
    };
    allChats.unshift(chat);
    allChats = allChats.slice(0, 20); // Keep only last 20 chats
    localStorage.setItem('all-meditation-chats', JSON.stringify(allChats));
    currentChatId = id;
    localStorage.setItem('current-meditation-chat', id);
    renderChatHistorySidebar();
    loadSavedChatHistory();
}

function saveCurrentChat(messages) {
    const idx = allChats.findIndex(c => c.id === currentChatId);
    if (idx !== -1) {
        allChats[idx].messages = messages;
        // Optionally update title based on first user message
        if (messages.length > 0 && messages[0].userMessage) {
            allChats[idx].title = messages[0].userMessage.slice(0, 30) + (messages[0].userMessage.length > 30 ? '...' : '');
        }
        localStorage.setItem('all-meditation-chats', JSON.stringify(allChats));
    }
}

function renderChatHistorySidebar() {
    if (allChats.length === 0) {
        chatHistorySidebar.style.display = 'none';
        document.body.classList.remove('with-sidebar');
        return;
    }
    chatHistorySidebar.style.display = 'flex';
    document.body.classList.add('with-sidebar');
    chatHistorySidebar.innerHTML = allChats.map(chat => `
        <div class="chat-history-item${chat.id === currentChatId ? ' selected' : ''}" data-id="${chat.id}">
            <span>${chat.title || 'New Chat'}</span>
            <button class="delete-chat-btn" title="Delete chat" data-delete-id="${chat.id}"><i class='bx bx-trash'></i></button><br>
            <span style="font-size:0.8em;color:var(--placeholder-color);">${chat.created}</span>
        </div>
    `).join('');
    // Add click listeners
    Array.from(chatHistorySidebar.querySelectorAll('.chat-history-item')).forEach(item => {
        item.onclick = (e) => {
            // Prevent click if delete button was clicked
            if (e.target.closest('.delete-chat-btn')) return;
            currentChatId = item.getAttribute('data-id');
            localStorage.setItem('current-meditation-chat', currentChatId);
            renderChatHistorySidebar();
            loadSavedChatHistory();
        };
    });
    // Add delete listeners
    Array.from(chatHistorySidebar.querySelectorAll('.delete-chat-btn')).forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-delete-id');
            const idx = allChats.findIndex(c => c.id === id);
            if (idx !== -1) {
                allChats.splice(idx, 1);
                localStorage.setItem('all-meditation-chats', JSON.stringify(allChats));
                // If deleted chat is current, switch to next or create new
                if (currentChatId === id) {
                    if (allChats.length > 0) {
                        currentChatId = allChats[0].id;
                        localStorage.setItem('current-meditation-chat', currentChatId);
                    } else {
                        createNewChat();
                        return;
                    }
                }
                renderChatHistorySidebar();
                loadSavedChatHistory();
            }
        };
    });
}

// Load saved data from local storage
const loadSavedChatHistory = () => {
    let chat = allChats.find(c => c.id === currentChatId);
    let savedConversations = chat ? chat.messages : [];
    const isLightTheme = localStorage.getItem("themeColor") === "light_mode";

    document.body.classList.toggle("light_mode", isLightTheme);
    themeToggleButton.innerHTML = isLightTheme ? '<i class="bx bx-moon"></i>' : '<i class="bx bx-sun"></i>';

    chatHistoryContainer.innerHTML = '';

    // Iterate through saved chat history and display messages
    savedConversations.forEach(conversation => {
        // Display the user's message
        const userMessageHtml = `
            <div class="message__content">
                <img class="message__avatar" src="assets/icon.png" alt="User avatar">
               <p class="message__text">${conversation.userMessage}</p>
            </div>
        `;

        const outgoingMessageElement = createChatMessageElement(userMessageHtml, "message--outgoing");
        chatHistoryContainer.appendChild(outgoingMessageElement);

        // Display the API response
        const responseText = conversation.apiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsedApiResponse = marked.parse(responseText); // Convert to HTML
        const rawApiResponse = responseText; // Plain text version

        const responseHtml = `
           <div class="message__content">
                <img class="message__avatar" src="assets/icon.png" alt="Coach avatar">
                <p class="message__text"></p>
                <div class="message__loading-indicator hide">
                    <div class="message__loading-bar"></div>
                    <div class="message__loading-bar"></div>
                    <div class="message__loading-bar"></div>
                </div>
            </div>
            <span onClick="copyMessageToClipboard(this)" class="message__icon hide"><i class='bx bx-copy-alt'></i></span>
        `;

        const incomingMessageElement = createChatMessageElement(responseHtml, "message--incoming");
        chatHistoryContainer.appendChild(incomingMessageElement);

        const messageTextElement = incomingMessageElement.querySelector(".message__text");

        // Display saved chat without typing effect
        showTypingEffect(rawApiResponse, parsedApiResponse, messageTextElement, incomingMessageElement, true); // 'true' skips typing
    });

    document.body.classList.toggle("hide-header", savedConversations.length > 0);

    // Show guideline if chat is empty
    if (savedConversations.length === 0) {
        showWelcomeGuidelineMessage();
    }
};

// create a new chat message element
const createChatMessageElement = (htmlContent, ...cssClasses) => {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", ...cssClasses);
    messageElement.innerHTML = htmlContent;
    return messageElement;
}

// Show typing effect
const showTypingEffect = (rawText, htmlText, messageElement, incomingMessageElement, skipEffect = false) => {
    const copyIconElement = incomingMessageElement.querySelector(".message__icon");
    copyIconElement.classList.add("hide"); // Initially hide copy button

    if (skipEffect) {
        // Display content directly without typing
        messageElement.innerHTML = htmlText;
        hljs.highlightAll();
        addCopyButtonToCodeBlocks();
        copyIconElement.classList.remove("hide"); // Show copy button
        isGeneratingResponse = false;
        return;
    }

    const wordsArray = rawText.split(' ');
    let wordIndex = 0;

    const typingInterval = setInterval(() => {
        messageElement.innerText += (wordIndex === 0 ? '' : ' ') + wordsArray[wordIndex++];
        if (wordIndex === wordsArray.length) {
            clearInterval(typingInterval);
            isGeneratingResponse = false;
            messageElement.innerHTML = htmlText;
            hljs.highlightAll();
            addCopyButtonToCodeBlocks();
            copyIconElement.classList.remove("hide");
        }
    }, 75);
};

// Fetch API response based on user input
const requestApiResponse = async (incomingMessageElement) => {
    const messageTextElement = incomingMessageElement.querySelector(".message__text");

    try {
        const response = await fetch(API_REQUEST_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [
                    { role: "user", parts: [{ text: MEDITATION_SYSTEM_PROMPT + "\n\n" + currentUserMessage }] }
                ]
            }),
        });

        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.error.message);

        const responseText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) throw new Error("Invalid API response.");

        const parsedApiResponse = marked.parse(responseText);
        const rawApiResponse = responseText;

        showTypingEffect(rawApiResponse, parsedApiResponse, messageTextElement, incomingMessageElement);

        // Save API response to current chat
        let chat = allChats.find(c => c.id === currentChatId);
        if (chat) {
            chat.messages = chat.messages || [];
            // Find last user message without apiResponse
            for (let i = chat.messages.length - 1; i >= 0; i--) {
                if (!chat.messages[i].apiResponse) {
                    chat.messages[i].apiResponse = responseData;
                    break;
                }
            }
            saveCurrentChat(chat.messages);
        }
    } catch (error) {
        isGeneratingResponse = false;
        messageTextElement.innerText = error.message;
        messageTextElement.closest(".message").classList.add("message--error");
    } finally {
        incomingMessageElement.classList.remove("message--loading");
    }
};

// Add copy button to code blocks
const addCopyButtonToCodeBlocks = () => {
    const codeBlocks = document.querySelectorAll('pre');
    codeBlocks.forEach((block) => {
        const codeElement = block.querySelector('code');
        let language = [...codeElement.classList].find(cls => cls.startsWith('language-'))?.replace('language-', '') || 'Text';

        const languageLabel = document.createElement('div');
        languageLabel.innerText = language.charAt(0).toUpperCase() + language.slice(1);
        languageLabel.classList.add('code__language-label');
        block.appendChild(languageLabel);

        const copyButton = document.createElement('button');
        copyButton.innerHTML = `<i class='bx bx-copy'></i>`;
        copyButton.classList.add('code__copy-btn');
        block.appendChild(copyButton);

        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(codeElement.innerText).then(() => {
                copyButton.innerHTML = `<i class='bx bx-check'></i>`;
                setTimeout(() => copyButton.innerHTML = `<i class='bx bx-copy'></i>`, 2000);
            }).catch(err => {
                console.error("Copy failed:", err);
                alert("Unable to copy text!");
            });
        });
    });
};

// Show loading animation during API request
const displayLoadingAnimation = () => {
    const loadingHtml = `
        <div class="message__content">
            <img class="message__avatar" src="assets/icon.png" alt="Coach avatar">
            <p class="message__text"></p>
            <div class="message__loading-indicator">
                <div class="message__loading-bar"></div>
                <div class="message__loading-bar"></div>
                <div class="message__loading-bar"></div>
            </div>
        </div>
        <span onClick="copyMessageToClipboard(this)" class="message__icon hide"><i class='bx bx-copy-alt'></i></span>
    `;

    const loadingMessageElement = createChatMessageElement(loadingHtml, "message--incoming", "message--loading");
    chatHistoryContainer.appendChild(loadingMessageElement);

    requestApiResponse(loadingMessageElement);
};

// Copy message to clipboard
const copyMessageToClipboard = (copyButton) => {
    const messageContent = copyButton.parentElement.querySelector(".message__text").innerText;

    navigator.clipboard.writeText(messageContent);
    copyButton.innerHTML = `<i class='bx bx-check'></i>`; // Confirmation icon
    setTimeout(() => copyButton.innerHTML = `<i class='bx bx-copy-alt'></i>`, 1000); // Revert icon after 1 second
};

// Handle sending chat messages
const handleOutgoingMessage = () => {
    currentUserMessage = messageForm.querySelector(".prompt__form-input").value.trim() || currentUserMessage;
    if (!currentUserMessage || isGeneratingResponse) return; // Exit if no message or already generating response

    isGeneratingResponse = true;

    const outgoingMessageHtml = `
        <div class="message__content">
            <img class="message__avatar" src="assets/icon.png" alt="User avatar">
            <p class="message__text"></p>
        </div>
    `;

    const outgoingMessageElement = createChatMessageElement(outgoingMessageHtml, "message--outgoing");
    outgoingMessageElement.querySelector(".message__text").innerText = currentUserMessage;
    chatHistoryContainer.appendChild(outgoingMessageElement);

    // Save user message to current chat
    let chat = allChats.find(c => c.id === currentChatId);
    if (chat) {
        chat.messages = chat.messages || [];
        chat.messages.push({ userMessage: currentUserMessage });
        saveCurrentChat(chat.messages);
    }

    messageForm.reset(); // Clear input field
    document.body.classList.add("hide-header");
    setTimeout(displayLoadingAnimation, 500); // Show loading animation after delay
};

// Update theme toggler to switch between light and dark mode
const DARK_THEME_VARS = {
    '--primary-color': '#181818',
    '--secondary-color': '#23272a',
    '--secondary-hover-color': '#2c2f33',
    '--focus-color': '#23272a',
    '--focus-hover-color': '#2c2f33',
    '--button-hover-color': '#333',
    '--accent-color': '#6EC6CA',
    '--accent-color-2': '#222e2e',
    '--highlight-color': '#F7B267',
    '--text-color': '#f5f5f5',
    '--text-secondary-color': '#bdbdbd',
    '--heading-secondary-color': '#6EC6CA',
    '--placeholder-color': '#888'
};
const LIGHT_THEME_VARS = {
    '--primary-color': '#E6F0EF',
    '--secondary-color': '#F7FAF9',
    '--secondary-hover-color': '#D6E5E3',
    '--focus-color': '#C7E5E0',
    '--focus-hover-color': '#B3D9B3',
    '--button-hover-color': '#A3D9B1',
    '--accent-color': '#6EC6CA',
    '--accent-color-2': '#A3D9B1',
    '--highlight-color': '#F7B267',
    '--text-color': '#333',
    '--text-secondary-color': '#4D4D4D',
    '--heading-secondary-color': '#6EC6CA',
    '--placeholder-color': '#A0B3B0'
};

function setThemeVars(vars) {
    for (const key in vars) {
        document.documentElement.style.setProperty(key, vars[key]);
    }
}

// On load, set theme from localStorage
(function() {
    const theme = localStorage.getItem('themeColor') || 'light_mode';
    if (theme === 'dark_mode') {
        setThemeVars(DARK_THEME_VARS);
        document.body.classList.remove('light_mode');
        document.body.classList.add('dark_mode');
        themeToggleButton.innerHTML = "<i class='bx bx-moon'></i>";
    } else {
        setThemeVars(LIGHT_THEME_VARS);
        document.body.classList.remove('dark_mode');
        document.body.classList.add('light_mode');
        themeToggleButton.innerHTML = "<i class='bx bx-sun'></i>";
    }
})();

themeToggleButton.addEventListener('click', () => {
    const isLight = document.body.classList.contains('light_mode');
    if (isLight) {
        setThemeVars(DARK_THEME_VARS);
        document.body.classList.remove('light_mode');
        document.body.classList.add('dark_mode');
        localStorage.setItem('themeColor', 'dark_mode');
        themeToggleButton.innerHTML = "<i class='bx bx-moon'></i>";
    } else {
        setThemeVars(LIGHT_THEME_VARS);
        document.body.classList.remove('dark_mode');
        document.body.classList.add('light_mode');
        localStorage.setItem('themeColor', 'light_mode');
        themeToggleButton.innerHTML = "<i class='bx bx-sun'></i>";
    }
});

// Clear all chat history
clearChatButton.addEventListener('click', () => {
    if (confirm("Are you sure you want to delete all chat history?")) {
        localStorage.removeItem("saved-api-chats");

        // Reload chat history to reflect changes
        loadSavedChatHistory();

        currentUserMessage = null;
        isGeneratingResponse = false;
    }
});

// Handle click on suggestion items
suggestionItems.forEach(suggestion => {
    suggestion.addEventListener('click', () => {
        currentUserMessage = suggestion.querySelector(".suggests__item-text").innerText;
        handleOutgoingMessage();
    });
});

// Prevent default from submission and handle outgoing message
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleOutgoingMessage();
});

// Load saved chat history on page load
loadSavedChatHistory();

// Meditation Modal Interactivity and Progress Tracking
const meditationActionItems = document.querySelectorAll('.meditation-action__item');
const meditationModal = document.getElementById('meditationModal');
const closeMeditationModal = document.getElementById('closeMeditationModal');
const startMeditationBtn = document.getElementById('startMeditationBtn');
const meditationTimer = document.getElementById('meditationTimer');
const meditationInstructions = document.getElementById('meditationInstructions');
const progressContent = document.querySelector('.progress__content');

let meditationInterval = null;
let meditationTimeLeft = 300; // 5 minutes in seconds

function formatTime(seconds) {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
}

function openMeditationModal() {
    meditationModal.style.display = 'flex';
    meditationTimeLeft = 300;
    meditationTimer.textContent = formatTime(meditationTimeLeft);
    meditationInstructions.innerHTML = '<p>Find a comfortable position, close your eyes, and focus on your breath. Let thoughts come and go without judgment. I will let you know when the session is complete.</p>';
    startMeditationBtn.disabled = false;
    startMeditationBtn.textContent = 'Start';
}

function closeMeditation() {
    meditationModal.style.display = 'none';
    clearInterval(meditationInterval);
}

function startMeditation() {
    startMeditationBtn.disabled = true;
    startMeditationBtn.textContent = 'Meditating...';
    meditationInterval = setInterval(() => {
        meditationTimeLeft--;
        meditationTimer.textContent = formatTime(meditationTimeLeft);
        if (meditationTimeLeft <= 0) {
            clearInterval(meditationInterval);
            meditationTimer.textContent = '00:00';
            meditationInstructions.innerHTML = '<p>Session complete! Take a moment to notice how you feel.</p>';
            startMeditationBtn.textContent = 'Done!';
            updateMeditationProgress();
        }
    }, 1000);
}

function updateMeditationProgress() {
    // Get today's date (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    let progress = JSON.parse(localStorage.getItem('meditation-progress')) || { sessions: 0, minutes: 0, lastDate: '', streak: 0 };
    progress.sessions += 1;
    progress.minutes += 5;
    if (progress.lastDate === today) {
        // Already meditated today, streak unchanged
    } else {
        // If yesterday was lastDate, increment streak, else reset
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (progress.lastDate === yesterday) {
            progress.streak += 1;
        } else {
            progress.streak = 1;
        }
        progress.lastDate = today;
    }
    localStorage.setItem('meditation-progress', JSON.stringify(progress));
    renderMeditationProgress();
}

function renderMeditationProgress() {
    let progress = JSON.parse(localStorage.getItem('meditation-progress')) || { sessions: 0, minutes: 0, lastDate: '', streak: 0 };
    progressContent.innerHTML = `
        <div><strong>Sessions:</strong> ${progress.sessions}</div>
        <div><strong>Total Minutes:</strong> ${progress.minutes}</div>
        <div><strong>Streak:</strong> ${progress.streak} day(s)</div>
    `;
}

// Attach event listeners
if (meditationActionItems.length > 0) {
    meditationActionItems[0].addEventListener('click', openMeditationModal);
}
closeMeditationModal.addEventListener('click', closeMeditation);
startMeditationBtn.addEventListener('click', startMeditation);

// Render progress on load
renderMeditationProgress();

function setDailyTip() {
    const today = new Date().toISOString().split('T')[0];
    let stored = JSON.parse(localStorage.getItem('meditation-daily-tip')) || {};
    if (stored.date === today && stored.tip) {
        dailyTipContent.textContent = stored.tip;
    } else {
        const tip = DAILY_TIPS[Math.floor(Math.random() * DAILY_TIPS.length)];
        dailyTipContent.textContent = tip;
        localStorage.setItem('meditation-daily-tip', JSON.stringify({ date: today, tip }));
    }
}
setDailyTip();

function showWelcomeGuidelineMessage() {
    const welcomeHtml = `
        <div class="message__content">
            <img class="message__avatar" src="assets/icon.png" alt="Coach avatar">
            <div class="message__text">
                <strong>👋 Welcome to your Meditation Coach!</strong><br><br>
                You can ask me about:<br>
                • Guided meditations (e.g., "Guide me through a 5-minute meditation")<br>
                • Mindfulness tips<br>
                • Breathing exercises<br>
                • How to relax or reduce stress<br><br>
                <em>Just type your question or request below!</em>
            </div>
        </div>
    `;
    const welcomeMessageElement = createChatMessageElement(welcomeHtml, "message--incoming");
    chatHistoryContainer.appendChild(welcomeMessageElement);
}

// --- Meditation Actions Interactivity ---
const breathingModal = document.getElementById('breathingModal');
const closeBreathingModal = document.getElementById('closeBreathingModal');
const startBreathingBtn = document.getElementById('startBreathingBtn');
const breathingCircle = document.querySelector('.breathing-circle');
const breathingText = document.getElementById('breathingText');

const affirmationModal = document.getElementById('affirmationModal');
const closeAffirmationModal = document.getElementById('closeAffirmationModal');
const affirmationText = document.getElementById('affirmationText');
const newAffirmationBtn = document.getElementById('newAffirmationBtn');

const moodModal = document.getElementById('moodModal');
const closeMoodModal = document.getElementById('closeMoodModal');
const moodInput = document.getElementById('moodInput');
const saveMoodBtn = document.getElementById('saveMoodBtn');
const moodJournalContent = document.querySelector('.mood-journal__content');

// Open modals for each action
if (meditationActionItems.length > 1) {
    meditationActionItems[1].addEventListener('click', () => {
        breathingModal.style.display = 'flex';
        resetBreathing();
    });
}
if (meditationActionItems.length > 2) {
    meditationActionItems[2].addEventListener('click', () => {
        affirmationModal.style.display = 'flex';
        showRandomAffirmation();
    });
}
if (meditationActionItems.length > 3) {
    meditationActionItems[3].addEventListener('click', () => {
        moodModal.style.display = 'flex';
        moodInput.value = '';
    });
}
closeBreathingModal.addEventListener('click', () => breathingModal.style.display = 'none');
closeAffirmationModal.addEventListener('click', () => affirmationModal.style.display = 'none');
closeMoodModal.addEventListener('click', () => moodModal.style.display = 'none');

// --- Breathing Exercise Logic ---
let breathingInterval = null;
let breathingStep = 0;
const breathingSteps = [
    { text: 'Breathe In', class: 'expand', duration: 4000 },
    { text: 'Hold', class: 'expand', duration: 4000 },
    { text: 'Breathe Out', class: 'shrink', duration: 4000 },
    { text: 'Hold', class: 'shrink', duration: 4000 }
];
function resetBreathing() {
    clearInterval(breathingInterval);
    breathingStep = 0;
    breathingCircle.className = 'breathing-circle';
    breathingText.textContent = 'Breathe In';
    startBreathingBtn.disabled = false;
    startBreathingBtn.textContent = 'Start';
}
function startBreathing() {
    startBreathingBtn.disabled = true;
    startBreathingBtn.textContent = 'Breathing...';
    breathingStep = 0;
    doBreathingStep();
    breathingInterval = setInterval(doBreathingStep, 4000);
}
function doBreathingStep() {
    const step = breathingSteps[breathingStep % breathingSteps.length];
    breathingText.textContent = step.text;
    breathingCircle.className = 'breathing-circle ' + step.class;
    breathingStep++;
}
startBreathingBtn.addEventListener('click', startBreathing);

// --- Affirmation Logic ---
const AFFIRMATIONS = [
    "You are calm and centered.",
    "Peace flows through you with every breath.",
    "You are worthy of rest and relaxation.",
    "Let go of what you cannot control.",
    "You are present in this moment.",
    "You are enough, just as you are.",
    "Your mind is clear and peaceful.",
    "You radiate positivity and calm.",
    "You are resilient and strong.",
    "You deserve kindness—from yourself and others."
];
function showRandomAffirmation() {
    const affirmation = AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];
    affirmationText.textContent = affirmation;
}
newAffirmationBtn.addEventListener('click', showRandomAffirmation);

// --- Mood Logging Logic ---
function saveMood() {
    const mood = moodInput.value.trim();
    if (!mood) return;
    let moods = JSON.parse(localStorage.getItem('mood-journal')) || [];
    moods.unshift({ mood, date: new Date().toLocaleString() });
    moods = moods.slice(0, 10); // Keep only last 10 moods
    localStorage.setItem('mood-journal', JSON.stringify(moods));
    renderMoodJournal();
    moodModal.style.display = 'none';
}
saveMoodBtn.addEventListener('click', saveMood);
function renderMoodJournal() {
    let moods = JSON.parse(localStorage.getItem('mood-journal')) || [];
    if (moods.length === 0) {
        moodJournalContent.textContent = '(Mood entries will appear here)';
        return;
    }
    moodJournalContent.innerHTML = moods.map(m => `<div><strong>${m.mood}</strong> <span style="color:var(--placeholder-color);font-size:0.9em;">${m.date}</span></div>`).join('');
}
renderMoodJournal();

// New Chat button handler
newChatButton.addEventListener('click', createNewChat);

// On page load, always start a new chat
createNewChat();