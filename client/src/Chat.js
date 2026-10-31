import React, { memo, useCallback, useEffect, useState } from "react";
import ScrollToBottom from "react-scroll-to-bottom";
import { emitWithAck } from "./socket";

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});

const Message = memo(function Message({ message, isOwn }) {
  if (message.system) {
    return <div className="system-message">{message.message}</div>;
  }
  return (
    <div className="message" id={isOwn ? "you" : "other"}>
      <div>
        <div className={`message-content${message.pending ? " pending" : ""}`}>
          <p>{message.message}</p>
        </div>
        <div className="message-meta">
          <p id="time">{timeFormatter.format(message.timestamp)}</p>
          <p id="author">{message.author}</p>
        </div>
      </div>
    </div>
  );
});

function Chat({ socket, username, room }) {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [connected, setConnected] = useState(socket.connected);

  const addMessage = useCallback(
    (message) => setMessageList((list) => [...list, message]),
    []
  );

  useEffect(() => {
    const onReceive = (data) => addMessage(data);
    const systemMessage = (text) =>
      addMessage({ id: `${Date.now()}-${Math.random()}`, system: true, message: text });
    const onJoined = ({ username: name }) => systemMessage(`${name} joined the party`);
    const onLeft = ({ username: name }) => systemMessage(`${name} left`);
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on("receive_message", onReceive);
    socket.on("user_joined", onJoined);
    socket.on("user_left", onLeft);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("receive_message", onReceive);
      socket.off("user_joined", onJoined);
      socket.off("user_left", onLeft);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket, addMessage]);

  const sendMessage = async () => {
    const text = currentMessage.trim();
    if (!text) return;

    const tempId = `pending-${Date.now()}`;
    addMessage({
      id: tempId,
      author: username,
      message: text,
      timestamp: Date.now(),
      pending: true,
    });
    setCurrentMessage("");

    const res = await emitWithAck("send_message", { message: text });
    setMessageList((list) =>
      res.ok
        ? list.map((m) => (m.id === tempId ? res.message : m))
        : list.filter((m) => m.id !== tempId)
    );
    if (!res.ok) setCurrentMessage(text);
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <p>
          Live Chat · {room}
          <span
            className={`status ${connected ? "online" : "offline"}`}
            title={connected ? "Connected" : "Reconnecting…"}
          />
        </p>
      </div>
      <div className="chat-body">
        <ScrollToBottom className="message-container">
          {messageList.length === 0 && (
            <p className="empty-chat-hint">You are first here — send a wave.</p>
          )}
          {messageList.map((message) => (
            <Message
              key={message.id}
              message={message}
              isOwn={message.author === username}
            />
          ))}
        </ScrollToBottom>
      </div>
      <div className="chat-footer">
        <input
          type="text"
          value={currentMessage}
          placeholder={connected ? "Say something fun…" : "Waiting for server…"}
          maxLength={1000}
          disabled={!connected}
          onChange={(event) => setCurrentMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") sendMessage();
          }}
        />
        <button onClick={sendMessage} disabled={!connected} aria-label="Send message">
          &#9658;
        </button>
      </div>
    </div>
  );
}

export default Chat;
