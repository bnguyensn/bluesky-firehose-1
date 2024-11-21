import { useEffect, useRef, useState } from 'react';
import { wordToColor } from './utils/wordToColor';
import './App.css';

const wsUrlXrpc = 'wss://bsky.network/xrpc/com.atproto.sync.subscribeRepos';
const wsUrlJetStream =
  'wss://jetstream1.us-west.bsky.network/subscribe?wantedCollections=app.bsky.feed.post';

function getPostText(rawMessage) {
  return rawMessage.commit.record.text;
}

const CREATED_POST_ELEMENT_ID = 'created-post';
const MESSAGES_COUNT_ELEMENT_ID = 'message-count';
const WORDS_COUNT_ELEMENT_ID = 'word-count';
const COLOR_SIGN_ELEMENT_ID = 'color-sign';

function wsInit({
  socketRef,
  messagesCountRef,
  wordsCountRef,
  onOpen,
  onClose,
}) {
  socketRef.current = new WebSocket(wsUrlJetStream);
  const socket = socketRef.current;

  let latestMessage = '';
  const REFRESH_RATE = 60;
  const updateInterval = 1000 / REFRESH_RATE;
  let lastUpdateTime = 0;
  const messageElement = document.getElementById(CREATED_POST_ELEMENT_ID);
  const messagesCountElement = document.getElementById(
    MESSAGES_COUNT_ELEMENT_ID,
  );
  const wordsCountElement = document.getElementById(WORDS_COUNT_ELEMENT_ID);
  const colorSignElement = document.getElementById(COLOR_SIGN_ELEMENT_ID);

  const WORD_TO_COUNT = 'Trump';

  function socketOnMessageRAFCb(timestamp) {
    if (timestamp - lastUpdateTime >= updateInterval) {
      // Renders texts
      messageElement.textContent = latestMessage;
      messagesCountElement.textContent = `Messages count: ${messagesCountRef.current}`;
      wordsCountElement.textContent = `Words count: ${wordsCountRef.current}`;
      colorSignElement.style.backgroundColor = wordToColor(
        latestMessage.slice(0, 10),
      );

      // Setup for next render
      lastUpdateTime = timestamp;
    }
  }

  socket.addEventListener('open', (event) => {
    messageElement.textContent = '';
    messagesCountElement.textContent = '';
    wordsCountElement.textContent = '';
    colorSignElement.style.backgroundColor = 'transparent';
    onOpen(event);
  });

  socket.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data?.commit?.operation === 'create') {
        latestMessage = getPostText(data);
        messagesCountRef.current++;
        if (latestMessage.includes(WORD_TO_COUNT)) {
          wordsCountRef.current++;
        }
        requestAnimationFrame(socketOnMessageRAFCb);
      }
    } catch (err) {
      console.log('message is not valid JSON');
    }
  });

  socket.addEventListener('close', (event) => {
    messagesCountRef.current = 0;
    wordsCountRef.current = 0;
    onClose(event);
  });

  socket.addEventListener('error', (event) => {
    // TODO
  });

  return socketRef;
}

function SocketStatus({ isSocketConnected }) {
  if (isSocketConnected) {
    return <div>🟢</div>;
  }
  return <div>🔴</div>;
}

function App() {
  const socketRef = useRef(null);
  const messagesCountRef = useRef(0);
  const wordsCountRef = useRef(0);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  return (
    <main>
      <h1>BlueSky Firehose</h1>
      <button
        onClick={() => {
          wsInit({
            socketRef,
            messagesCountRef,
            wordsCountRef,
            onOpen: () => {
              setIsSocketConnected(true);
            },
            onClose: () => {
              setIsSocketConnected(false);
            },
          });
        }}
      >
        Connect
      </button>
      <button
        onClick={() => {
          if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
          }
        }}
      >
        Disconnect
      </button>
      <SocketStatus isSocketConnected={isSocketConnected} />
      <p className="app-log" id={MESSAGES_COUNT_ELEMENT_ID}></p>
      <p className="app-log" id={WORDS_COUNT_ELEMENT_ID}></p>
      <div id={COLOR_SIGN_ELEMENT_ID} className="color-sign" />
      <p className="app-log" id={CREATED_POST_ELEMENT_ID}></p>
    </main>
  );
}

export default App;
