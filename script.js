document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const recognitionStatus = document.getElementById('recognition-status');
    const chatContainer = document.getElementById('chat-container');
    const chatMessages = document.getElementById('chat-messages');
    const typingIndicator = document.getElementById('typing-indicator');
    const voiceIndicator = document.getElementById('voice-indicator');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const micButton = document.getElementById('mic-button');

    // --- シンプルなロガー関数 ---
    function log(message, data = '') {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ${message}`, data);
    }

    // 現在のユーザーIDをHTMLから取得
    const currentUserId = document.body.dataset.userId;

    // ローカルストレージ用のキーと履歴を保持する配列
    const STORAGE_KEY = 'chat_app_history';
    let chatHistory = [];

    // このタブを識別するためのユニークID
    const tabId = `${currentUserId}-${Date.now()}-${Math.random()}`;

    // 複数タブ連携のためのBroadcastChannel
    const channel = new BroadcastChannel('chat_app_sync');

    // Web Speech APIの準備 (Chrome, Edgeなどで動作)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const synth = window.speechSynthesis;
    let recognition;
    let typingTimeout;
    let isRecognizing = false; // 音声認識中かどうかの状態を管理

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'ja-JP';
        recognition.interimResults = false;
        recognition.continuous = true; // 認識を継続する
    } else {
        micButton.style.display = 'none'; // APIがなければマイクボタンを非表示
        micButton.disabled = true;
        console.warn('Web Speech API is not supported in this browser.');
    }

    // --- イベントリスナー ---

    // --- BroadcastChannel メッセージ受信 ---
    channel.onmessage = (event) => {
        const { type, payload } = event.data;
        log('BroadcastChannel message received', { type, payload });

        // 自分自身が送信したイベントは無視する
        if (payload && payload.senderId === currentUserId) {
            log('Ignoring own event', { type });
            return;
        }

        // 他のユーザーからのイベントを処理
        switch (type) {
            case 'new_message':
                // 履歴に追加して保存
                chatHistory.push(payload);
                saveHistory();
                // 画面にメッセージを追加
                addMessage(payload.text, payload.senderId, payload.timestamp);
                // 入力中表示を消す
                hideTypingIndicator();
                // マイクがオンなら読み上げる
                if (isRecognizing) {
                    speak(payload.text);
                }
                break;

            case 'typing_start':
                showTypingIndicator();
                break;

            case 'typing_stop':
                hideTypingIndicator();
                break;

            case 'voice_input_start':
                showVoiceIndicator();
                break;

            case 'voice_input_stop':
                hideVoiceIndicator();
                break;
        }
    };

    // フォーム送信（Enterキーまたは送信ボタン）
    messageForm.addEventListener('submit', (e) => {
        e.preventDefault(); // ページの再読み込みを防ぐ
        sendMessage();
    });

    // 入力欄の変更
    messageInput.addEventListener('input', toggleSendButtonAvailability);
    messageInput.addEventListener('input', () => {
        // 既に入力中を通知していなければ、通知を開始
        if (!typingTimeout) {
            log('Broadcasting: typing_start');
            channel.postMessage({ type: 'typing_start', payload: { senderId: currentUserId } });
        } else {
            clearTimeout(typingTimeout);
        }

        // 2秒間入力がなければ、入力停止を通知
        typingTimeout = setTimeout(() => {
            log('Broadcasting: typing_stop');
            channel.postMessage({ type: 'typing_stop', payload: { senderId: currentUserId } });
            typingTimeout = null;
        }, 2000);
    });

    // マイクボタンのクリック
    micButton.addEventListener('click', toggleVoiceRecognition);

    // --- 音声認識のイベントハンドラ ---
    if (recognition) {
        recognition.onresult = (event) => {
            // continuousモードでは結果が蓄積されるため、最後のものを取得
            const transcript = event.results[event.results.length - 1][0].transcript.trim();
            if (transcript) {
                messageInput.value = transcript;
                sendMessage('voice'); // 音声入力から送信されたことを示す
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            isRecognizing = false; // エラーが起きても状態をリセット
            resetMicButtonUI();
        };

        recognition.onend = () => {
            // ユーザーが意図的に停止した場合以外（タイムアウト等）は自動で再開
            if (isRecognizing) {
                recognition.start();
            } else {
                resetMicButtonUI();
            }
        };
    }

    // --- 関数 ---

    // 履歴をローカルストレージに保存
    function saveHistory() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory));
    }

    // 履歴をローカルストレージから読み込んで表示
    function loadHistory() {
        const savedHistory = localStorage.getItem(STORAGE_KEY);
        if (savedHistory && savedHistory.length > 2) { // "[]" より大きい
            chatHistory = JSON.parse(savedHistory);
            // 初期メッセージをクリア
            chatMessages.innerHTML = ''; // ようこそメッセージを削除
            // 履歴を画面に反映
            chatHistory.forEach(msg => addMessage(msg.text, msg.senderId, msg.timestamp));
        } else {
            // 履歴がない場合、ウェルカムメッセージを表示
            const welcomeMessage = document.createElement('div');
            welcomeMessage.className = 'message other-message';
            welcomeMessage.textContent = 'ようこそ！チャットを開始してください。';
            chatMessages.appendChild(welcomeMessage);
        }
    }

    function showTypingIndicator() {
        typingIndicator.innerHTML = `相手が入力中<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>`;
        typingIndicator.classList.add('active');
        // 自動スクロールしてインジケーターが見えるようにする
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function hideTypingIndicator() {
        if (typingIndicator.classList.contains('active')) {
            typingIndicator.classList.remove('active');
            typingIndicator.innerHTML = '';
        }
    }

    function showVoiceIndicator() {
        // Font Awesomeのアイコンとテキストを設定
        voiceIndicator.innerHTML = `<i class="fas fa-microphone-alt"></i> 相手が音声入力中です...`;
        voiceIndicator.classList.add('active');
        // 自動スクロールしてインジケーターが見えるようにする
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function hideVoiceIndicator() {
        if (voiceIndicator.classList.contains('active')) {
            voiceIndicator.classList.remove('active');
            voiceIndicator.innerHTML = '';
        }
    }

    // メッセージをチャットに追加するヘルパー関数
    function addMessage(text, senderId, timestamp) {
        log('Adding message to DOM', { text, senderId, timestamp });
        const messageElement = document.createElement('div');
        const messageClass = senderId === currentUserId ? 'my-message' : 'other-message';
        messageElement.classList.add('message', messageClass);

        // Create element for the message text
        const textElement = document.createElement('span');
        textElement.className = 'message-text';
        textElement.textContent = text;

        // Create element for the timestamp
        const timestampElement = document.createElement('span');
        timestampElement.className = 'message-timestamp';
        if (timestamp) {
            const date = new Date(timestamp);
            timestampElement.textContent = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        }

        messageElement.appendChild(textElement);
        messageElement.appendChild(timestampElement);
        chatMessages.appendChild(messageElement);
        // 自動スクロール
        chatContainer.scrollTop = chatContainer.scrollHeight;
        return messageElement;
    }

    // メッセージ送信処理
    function sendMessage(triggeredBy = 'keyboard') { // 'keyboard' or 'voice'
        const messageText = messageInput.value.trim();
        if (!messageText) return;
        log('sendMessage called', { messageText, triggeredBy });

        // 入力中通知を停止し、相手に通知する
        if (typingTimeout) {
            clearTimeout(typingTimeout);
            typingTimeout = null;
        }
        log('Broadcasting: typing_stop (before sending)');
        channel.postMessage({ type: 'typing_stop', payload: { senderId: currentUserId } });

        // 送信するメッセージオブジェクトを作成
        const messagePayload = {
            text: messageText,
            senderId: currentUserId,
            timestamp: Date.now()
        };

        // 自分の画面にメッセージを即時表示し、履歴に保存
        addMessage(messagePayload.text, messagePayload.senderId, messagePayload.timestamp);
        chatHistory.push(messagePayload);
        saveHistory();

        // 他のタブにメッセージをブロードキャスト
        log('Broadcasting: new_message', messagePayload);
        channel.postMessage({ type: 'new_message', payload: messagePayload });

        // 入力欄をクリア
        messageInput.value = '';
        toggleSendButtonAvailability();
    }

    // 音声認識の開始/停止を切り替える
    function toggleVoiceRecognition() {
        if (!recognition) return;

        isRecognizing = !isRecognizing;

        if (isRecognizing) {
            // 認識を開始
            try {
                log('Broadcasting: voice_input_start');
                channel.postMessage({ type: 'voice_input_start', payload: { senderId: currentUserId } });
                recognition.start();
                // UIを「認識中」に変更
                micButton.classList.add('is-recognizing');
                micButton.innerHTML = '<i class="fas fa-stop"></i>';
                messageInput.placeholder = '話してください...終了するには再度ボタンを押します';
                recognitionStatus.classList.add('active'); // ステータスバーを表示
            } catch (error) {
                console.error('Error starting recognition:', error);
                isRecognizing = false;
                resetMicButtonUI();
            }
        } else {
            // 認識を停止
            log('Broadcasting: voice_input_stop');
            channel.postMessage({ type: 'voice_input_stop', payload: { senderId: currentUserId } });
            if (synth && synth.speaking) {
                synth.cancel(); // 進行中の読み上げをキャンセル
            }
            recognition.stop();
        }
    }

    function resetMicButtonUI() {
        micButton.classList.remove('is-recognizing');
        micButton.innerHTML = '<i class="fas fa-microphone"></i>';
        messageInput.placeholder = 'メッセージを入力...';
        recognitionStatus.classList.remove('active'); // ステータスバーを非表示
    }

    // 送信ボタンの有効/無効を切り替え
    function toggleSendButtonAvailability() {
        sendButton.disabled = !messageInput.value.trim();
    }

    // テキストを音声で読み上げる関数
    function speak(text) {
        if (!synth) {
            console.warn('Speech Synthesis not supported.');
            return;
        }
        // 他の読み上げが進行中ならキャンセル
        if (synth.speaking) {
            synth.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        // TODO: 特定の声を使いたい場合はここで設定
        synth.speak(utterance);
    }

    log('Application Initializing...', { userId: currentUserId, tabId });
    // アプリケーション起動時に履歴を読み込む
    loadHistory();
    log('Application Initialized.');
});