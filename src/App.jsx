import { useEffect, useRef, useState } from 'react';
import './App.css';

const wsUrlXrpc = 'wss://bsky.network/xrpc/com.atproto.sync.subscribeRepos';
const wsUrlJetStream =
  'wss://jetstream1.us-west.bsky.network/subscribe?wantedCollections=app.bsky.feed.post';

function getPostText(rawMessage) {
  return rawMessage.commit.record.text;
}

const CREATED_POST_ELEMENT_ID = 'created-post';
const MESSAGE_COUNT_ELEMENT_ID = 'message-count';
function logToElementFactory(elementId) {
  return function logToElement(...text) {
    document.getElementById(elementId).textContent = text.join('');
  };
}

function wsInit({ socketRef, messageCountRef, onOpen, onClose }) {
  socketRef.current = new WebSocket(wsUrlJetStream);
  const socket = socketRef.current;

  const logMessage = logToElementFactory(CREATED_POST_ELEMENT_ID);
  const logCount = logToElementFactory(MESSAGE_COUNT_ELEMENT_ID);

  let latestMessage = '';
  const REFRESH_RATE = 60;
  const updateInterval = 1000 / REFRESH_RATE;
  let lastUpdateTime = 0;
  const messageElement = document.getElementById(CREATED_POST_ELEMENT_ID);
  const countElement = document.getElementById(MESSAGE_COUNT_ELEMENT_ID);

  function socketOnMessageRAFCb(timestamp) {
    if (timestamp - lastUpdateTime >= updateInterval) {
      // Renders texts
      messageElement.textContent = latestMessage;
      countElement.textContent = `Messages count: ${messageCountRef.current++}`;

      // Setup for next render
      lastUpdateTime = timestamp;
    }
  }

  socket.addEventListener('open', (event) => {
    onOpen(event);
  });

  socket.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data?.commit?.operation === 'create') {
        latestMessage = getPostText(data);
        requestAnimationFrame(socketOnMessageRAFCb);

        // logMessage('Socket message: ', getPostText(data));
        // logCount(`Message count: ${messageCountRef.current++}`);
      }
    } catch (err) {
      console.log('message is not valid JSON');
    }
  });

  socket.addEventListener('close', (event) => {
    messageElement.textContent = '';
    countElement.textContent = '';
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
  const messageCountRef = useRef(0);
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
            messageCountRef,
            onOpen: () => {
              setIsSocketConnected(true);
            },
            onClose: () => {
              setIsSocketConnected(false);
              messageCountRef.current = 0;
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
      <p className="app-log" id={MESSAGE_COUNT_ELEMENT_ID}></p>
      <p className="app-log" id={CREATED_POST_ELEMENT_ID}></p>
    </main>
  );
}

export default App;
