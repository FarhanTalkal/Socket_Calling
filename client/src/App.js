import { useEffect, useState } from "react";
import "./App.css";
import Chat from "./Chat";
import { isServerConfigured, socket, emitWithAck } from "./socket";

function App() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => socket.disconnect(), []);

  useEffect(() => {
    if (!showChat) return;
    const rejoin = () => {
      if (!socket.recovered) emitWithAck("join_room", { username, room });
    };
    socket.on("connect", rejoin);
    return () => socket.off("connect", rejoin);
  }, [showChat, username, room]);

  const joinRoom = async (event) => {
    event.preventDefault();
    if (!isServerConfigured) return;

    const name = username.trim();
    const roomId = room.trim();
    if (!name || !roomId || joining) return;

    setJoining(true);
    setError("");
    if (!socket.connected) socket.connect();
    const res = await emitWithAck("join_room", { username: name, room: roomId });
    setJoining(false);

    if (res.ok) {
      setUsername(name);
      setRoom(roomId);
      setShowChat(true);
    } else {
      setError(res.error || "Could not join room. Is the server awake?");
    }
  };

  if (!isServerConfigured) {
    return (
      <div className="App">
        <div className="bg-orb" aria-hidden="true" />
        <div className="joinChatContainer">
          <p className="join-badge">Socket Calling</p>
          <h3>Almost there</h3>
          <p className="config-error">
            Set <code>REACT_APP_SERVER_URL</code> on Vercel to your Render API URL,
            then redeploy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="bg-orb" aria-hidden="true" />
      {!showChat ? (
        <form className="joinChatContainer" onSubmit={joinRoom}>
          <p className="join-badge">Socket Calling</p>
          <h3>Join a Chat</h3>
          <p className="join-subtitle">Pick a name, drop into a room, say hi.</p>
          <input
            type="text"
            placeholder="Your name"
            maxLength={32}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <input
            type="text"
            placeholder="Room ID"
            maxLength={32}
            value={room}
            onChange={(event) => setRoom(event.target.value)}
          />
          <button type="submit" disabled={joining}>
            {joining ? "Connecting..." : "Enter the room"}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      ) : (
        <Chat socket={socket} username={username} room={room} />
      )}
    </div>
  );
}

export default App;
