import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Plus,
  Send,
  MoreVertical,
  Paperclip,
  Smile,
  Phone,
  Video,
  CheckCheck,
  X,
} from "lucide-react";

import Navbar from "../../components/layout/Navbar";
import Sidebar from "../../components/layout/Sidebar";

import "./Messages.css";
import { API_URL, apiAssetUrl } from "../../lib/api";


interface BackendMessage {
  id: number;
  sender_id: number | null;
  receiver_id: number | null;
  sender_name: string;
  receiver_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
  attachment_name?: string | null;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
}

interface MessageContact {
  id: number;
  name: string;
  email: string;
  position?: string;
}

interface Message {
  id: number;
  text: string;
  time: string;
  sent: boolean;
  attachmentName?: string;
  attachmentUrl?: string;
}

type CallType = "audio" | "video";
interface CallSession {
  id: number;
  type: CallType;
  name: string;
  conversationName: string;
  direction: "incoming" | "outgoing";
  status: "ringing" | "active";
  offerSdp?: string;
}

const EMOJIS = ["😀", "😃", "😊", "😂", "🥰", "😍", "👍", "🙌", "🎉", "❤️", "👀", "🤔", "✅", "🚀", "🙏", "🔥"];

interface Conversation {
  id: number;
  name: string;
  role: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  messages: Message[];
  contactEmail?: string;
}

/*
=====================================================
HELPER FUNCTIONS
=====================================================
*/

const getToken = (): string => {
  return localStorage.getItem("token") || "";
};

const getLoggedInUserId = (): number | null => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const id = Number(user?.id);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
};

const getLoggedInUserName = (): string => {
  try {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      return "PRADEEP K";
    }

    const user = JSON.parse(storedUser);

    return (
      user.name ||
      user.username ||
      user.full_name ||
      user.fullName ||
      user.email ||
      "PRADEEP K"
    );
  } catch {
    return "PRADEEP K";
  }
};

const getInitials = (name: string): string => {
  const words = name.trim().split(/\s+/);

  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  return (
    words[0][0] +
    words[words.length - 1][0]
  ).toUpperCase();
};

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};


/*
=====================================================
MESSAGES COMPONENT
=====================================================
*/

function Messages() {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [messageText, setMessageText] =
    useState("");

  const [showNewMessage, setShowNewMessage] =
    useState(false);
  const [contacts, setContacts] = useState<MessageContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showConversationDetails, setShowConversationDetails] = useState(false);

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [callBusy, setCallBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callSessionRef = useRef<CallSession | null>(null);
  const callInFlightRef = useRef(false);
  callSessionRef.current = callSession;

  const currentUserName =
    getLoggedInUserName();

  /*
  ===================================================
  LOAD MESSAGES FROM DATABASE
  ===================================================
  */

  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoading(true);
        setError("");

        const token = getToken();

        if (!token) {
          setError("Login session expired. Please login again.");
          setLoading(false);
          return;
        }

        const response = await fetch(
          `${API_URL}/messages`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();

          throw new Error(
            `Failed to load messages (${response.status}): ${errorText}`
          );
        }

        const data: BackendMessage[] =
          await response.json();

        /*
        -----------------------------------------------
        Add database messages into conversations
        -----------------------------------------------
        */

        if (Array.isArray(data)) {
          const currentUserId = getLoggedInUserId();
          const relevantMessages = data.filter((dbMessage) =>
            (currentUserId !== null &&
              (dbMessage.sender_id === currentUserId ||
                dbMessage.receiver_id === currentUserId)) ||
            dbMessage.sender_name.toLowerCase() === currentUserName.toLowerCase() ||
            dbMessage.receiver_name.toLowerCase() === currentUserName.toLowerCase()
          );

          const updated: Conversation[] = [];

            relevantMessages.forEach((dbMessage) => {
              const isCurrentUserSender =
                dbMessage.sender_name.toLowerCase() ===
                currentUserName.toLowerCase();

              const otherPerson = isCurrentUserSender
                ? dbMessage.receiver_name
                : dbMessage.sender_name;

              let conversation =
                updated.find(
                  (item) =>
                    item.name.toLowerCase() ===
                    otherPerson.toLowerCase()
                );

              /*
              -----------------------------------------
              Create conversation if it doesn't exist
              -----------------------------------------
              */

              if (!conversation) {
                const counterpartId = isCurrentUserSender ? dbMessage.receiver_id : dbMessage.sender_id;
                conversation = {
                  id: counterpartId || -(updated.length + 1),
                  name: otherPerson,
                  role: "Team Member",
                  avatar: getInitials(otherPerson),
                  lastMessage: "",
                  time: "",
                  unread: 0,
                  messages: [],
                };

                updated.push(conversation);
              }

              /*
              -----------------------------------------
              Avoid duplicate messages
              -----------------------------------------
              */

              conversation.messages.push({
                id: dbMessage.id,
                text: dbMessage.message || "",
                time: formatTime(dbMessage.created_at),
                sent: isCurrentUserSender,
                attachmentName: dbMessage.attachment_name || undefined,
                attachmentUrl: dbMessage.attachment_url
                  ? apiAssetUrl(dbMessage.attachment_url)
                  : undefined,
              });

              conversation.lastMessage =
                dbMessage.message || (dbMessage.attachment_name ? `📎 ${dbMessage.attachment_name}` : "");

              conversation.time =
                formatTime(
                  dbMessage.created_at
                );
            });

          setConversations(updated);
          setSelectedId((previousId) =>
            previousId !== null && updated.some((item) => item.id === previousId)
              ? previousId
              : (updated[0]?.id ?? null)
          );
        }
      } catch (err) {
        console.error(
          "LOAD MESSAGES ERROR:",
          err
        );

        setError(
          "Could not load saved messages from the server."
        );
        setConversations([]);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [currentUserName]);


  /*
  ===================================================
  SELECTED CONVERSATION
  ===================================================
  */

  const selectedConversation =
    conversations.find(
      (conversation) =>
        conversation.id === selectedId
    );
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  const waitForIceGathering = (pc: RTCPeerConnection) => new Promise<void>((resolve) => {
    if (pc.iceGatheringState === "complete") return resolve();
    const timeout = window.setTimeout(() => {
      pc.removeEventListener("icegatheringstatechange", checkState);
      resolve();
    }, 8000);
    const checkState = () => {
      if (pc.iceGatheringState === "complete") {
        window.clearTimeout(timeout);
        pc.removeEventListener("icegatheringstatechange", checkState);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", checkState);
  });

  const makePeerConnection = (stream: MediaStream) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    pc.ontrack = (event) => setRemoteStream(event.streams[0] || new MediaStream([event.track]));
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") setError("The call connection failed. Check your network and try again.");
    };
    peerConnectionRef.current = pc;
    localStreamRef.current = stream;
    setLocalStream(stream);
    setRemoteStream(null);
    return pc;
  };

  const closeCallMedia = () => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallSession(null);
    callSessionRef.current = null;
    callInFlightRef.current = false;
  };

  const startCall = async (type: CallType) => {
    if (!selectedConversation || callBusy || callSession) return;
    setCallBusy(true);
    setError("");
    try {
      const token = getToken();
      if (!token) throw new Error("Login session expired. Please log in again.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });
      const pc = makePeerConnection(stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceGathering(pc);
      const response = await fetch(`${API_URL}/calls`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_name: selectedConversation.name, call_type: type, offer_sdp: pc.localDescription?.sdp }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Could not start the call.");
      setCallSession({ id: Number(payload.id), type, name: selectedConversation.name, conversationName: selectedConversation.name, direction: "outgoing", status: "ringing" });
    } catch (err) {
      console.error("START CALL ERROR:", err);
      setError(err instanceof Error ? err.message : "Could not start the call. Allow microphone/camera access and try again.");
      closeCallMedia();
    } finally {
      setCallBusy(false);
    }
  };

  const answerCall = async () => {
    const session = callSessionRef.current;
    if (!session?.offerSdp || callBusy) return;
    setCallBusy(true);
    setError("");
    try {
      const token = getToken();
      if (!token) throw new Error("Login session expired. Please log in again.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: session.type === "video" });
      const pc = makePeerConnection(stream);
      await pc.setRemoteDescription({ type: "offer", sdp: session.offerSdp });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForIceGathering(pc);
      const response = await fetch(`${API_URL}/calls/${session.id}/answer`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_name: session.conversationName, answer_sdp: pc.localDescription?.sdp }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "This call is no longer available.");
      setCallSession({ ...session, status: "active" });
    } catch (err) {
      console.error("ANSWER CALL ERROR:", err);
      setError(err instanceof Error ? err.message : "Could not answer the call.");
      closeCallMedia();
    } finally {
      setCallBusy(false);
    }
  };

  const endCall = async () => {
    const session = callSessionRef.current;
    if (!session) return;
    const token = getToken();
    try {
      if (token) await fetch(`${API_URL}/calls/${session.id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_name: session.conversationName, status: session.direction === "incoming" && session.status === "ringing" ? "rejected" : "ended" }),
      });
    } catch (err) { console.warn("END CALL SIGNAL ERROR:", err); }
    closeCallMedia();
  };

  useEffect(() => {
    const session = callSession;
    if (!session || session.direction !== "outgoing" || session.status !== "ringing") return;
    let disposed = false;
    const poll = async () => {
      if (disposed || callInFlightRef.current) return;
      callInFlightRef.current = true;
      try {
        const response = await fetch(`${API_URL}/calls/${session.id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
        if (response.ok) {
          const { call } = await response.json();
          if (!disposed && call?.status === "active" && call.answer_sdp && peerConnectionRef.current && !peerConnectionRef.current.currentRemoteDescription) {
            await peerConnectionRef.current.setRemoteDescription({ type: "answer", sdp: call.answer_sdp });
            setCallSession((current) => current?.id === session.id ? { ...current, status: "active" } : current);
          } else if (!disposed && ["ended", "rejected"].includes(call?.status)) closeCallMedia();
        }
      } catch (err) { console.warn("CALL STATUS POLL ERROR:", err); }
      finally { callInFlightRef.current = false; }
    };
    const timer = window.setInterval(poll, 1500);
    void poll();
    return () => { disposed = true; window.clearInterval(timer); };
  }, [callSession]);

  useEffect(() => {
    if (!callSession || callSession.direction !== "outgoing" || callSession.status !== "ringing") return;
    const timeout = window.setTimeout(() => {
      if (callSessionRef.current?.id === callSession.id) void endCall();
    }, 45000);
    return () => window.clearTimeout(timeout);
  }, [callSession]);

  useEffect(() => {
    if (!selectedConversation || callSession || loading) return;
    let disposed = false;
    const poll = async () => {
      if (disposed || callInFlightRef.current || callSessionRef.current) return;
      callInFlightRef.current = true;
      try {
        const response = await fetch(`${API_URL}/calls/incoming?conversation=${encodeURIComponent(selectedConversation.name)}`, { headers: { Authorization: `Bearer ${getToken()}` } });
        if (!response.ok) return;
        const { call } = await response.json();
        if (!disposed && call?.id && call.status === "ringing" && !callSessionRef.current) {
          const session: CallSession = { id: Number(call.id), type: call.call_type, name: call.caller_name, conversationName: call.conversation_name, direction: "incoming", status: "ringing", offerSdp: call.offer_sdp };
          callSessionRef.current = session;
          setCallSession(session);
        }
      } catch (err) { console.warn("INCOMING CALL POLL ERROR:", err); }
      finally { callInFlightRef.current = false; }
    };
    const timer = window.setInterval(poll, 2000);
    void poll();
    return () => { disposed = true; window.clearInterval(timer); };
  }, [selectedConversation?.name, callSession, loading]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
    if (remoteAudioRef.current && remoteStream) remoteAudioRef.current.srcObject = remoteStream;
  }, [remoteStream, localStream, callSession?.type]);

  useEffect(() => () => {
    peerConnectionRef.current?.close();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
  }, []);

  useEffect(() => {
    const chat = chatMessagesRef.current;
    if (chat && !loading) {
      chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" });
    }
  }, [loading, selectedId, selectedConversation?.messages.length]);


  /*
  ===================================================
  SEARCH
  ===================================================
  */

  const filteredConversations =
    useMemo(() => {
      return conversations.filter(
        (conversation) =>
          conversation.name
            .toLowerCase()
            .includes(
              searchTerm.toLowerCase()
            )
      );
    }, [
      conversations,
      searchTerm,
    ]);


  /*
  ===================================================
  SELECT CONVERSATION
  ===================================================
  */

  const selectConversation = (
    id: number
  ) => {
    setSelectedId(id);

    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === id
          ? {
              ...conversation,
              unread: 0,
            }
          : conversation
      )
    );
  };

  const loadContacts = async () => {
    setContactsLoading(true);
    try {
      const response = await fetch(`${API_URL}/message-contacts`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) throw new Error("Could not load contacts.");
      const data: MessageContact[] = await response.json();
      setContacts(Array.isArray(data) ? data : []);
    } catch {
      setError("Could not load workspace members. Please try again.");
    } finally {
      setContactsLoading(false);
    }
  };

  const startConversation = (contact: MessageContact) => {
    const existing = conversations.find((item) => item.name.toLowerCase() === contact.name.toLowerCase());
    if (existing) {
      selectConversation(existing.id);
    } else {
      const newConversation: Conversation = {
      id: -contact.id,
        name: contact.name,
      role: contact.position || "Employee",
        avatar: getInitials(contact.name),
        lastMessage: "",
        time: "",
        unread: 0,
        messages: [],
      contactEmail: contact.email,
      };
      setConversations((previous) => [newConversation, ...previous]);
      setSelectedId(newConversation.id);
    }
    setShowNewMessage(false);
  };


  /*
  ===================================================
  SEND MESSAGE TO BACKEND
  ===================================================
  */

  const sendMessage = async () => {
    const text =
      messageText.trim();

    if (sending || !selectedConversation) return;
    if (!text && !selectedFile) {
      setError("Please enter a message.");
      return;
    }

    try {
      setSending(true);
      setError("");

      const token = getToken();

      if (!token) {
        setError(
          "Login session expired. Please login again."
        );
        return;
      }

      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      let body: BodyInit;
      if (selectedFile) {
        const formData = new FormData();
        formData.append("sender_id", String(getLoggedInUserId() ?? ""));
        formData.append("sender_name", currentUserName);
        formData.append("receiver_name", selectedConversation.name);
        if (selectedConversation.contactEmail) formData.append("receiver_email", selectedConversation.contactEmail);
        formData.append("message", text);
        formData.append("attachment", selectedFile);
        body = formData;
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify({
          sender_id: getLoggedInUserId(),
          sender_name: currentUserName,
          receiver_name: selectedConversation.name,
          receiver_email: selectedConversation.contactEmail,
          message: text,
        });
      }

      const response = await fetch(
        `${API_URL}/messages`,
        {
          method: "POST",
          headers,
          body,
        }
      );

      if (!response.ok) {
        const errorText =
          await response.text();

        throw new Error(
          `Failed to send message (${response.status}): ${errorText}`
        );
      }

      const result: { message?: BackendMessage | string; id?: number } = await response.json();
      const returnedRow = typeof result.message === "object" ? result.message : null;
      const savedId = returnedRow?.id ?? Number(result.id);
      if (!savedId) {
        throw new Error("The server did not return the saved message.");
      }

      const newMessage: Message = {
        id: savedId,
        text: returnedRow?.message ?? text,
        time: returnedRow?.created_at
          ? formatTime(returnedRow.created_at)
          : new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        sent: true,
        attachmentName: returnedRow?.attachment_name || selectedFile?.name || undefined,
        attachmentUrl: returnedRow?.attachment_url
          ? apiAssetUrl(returnedRow.attachment_url)
          : undefined,
      };

      /*
      -----------------------------------------------
      Update UI immediately
      -----------------------------------------------
      */

      setConversations((previous) => {
        return previous.map((conversation) =>
          conversation.id === selectedConversation.id
            ? {
                ...conversation,
                lastMessage: text || `📎 ${selectedFile?.name ?? returnedRow?.attachment_name ?? "File"}`,
                time: newMessage.time,
                messages: [
                  ...conversation.messages,
                  newMessage,
                ],
              }
            : conversation
        );
      });

      setMessageText("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error(
        "SEND MESSAGE ERROR:",
        err
      );

      setError(
        "Message could not be saved. Check that the backend is running."
      );
    } finally {
      setSending(false);
    }
  };


  /*
  ===================================================
  ENTER TO SEND
  ===================================================
  */

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  };


  /*
  ===================================================
  UI
  ===================================================
  */

  return (
    <div className="messages-page-layout">

      <Navbar />

      <div className="messages-body">

        <Sidebar />

        <main className="messages-main">

          <div className="messages-container">

            {/* PAGE HEADER */}

            <div className="messages-page-header">

              <div>
                <h1>Messages</h1>

                <p>
                  Communicate with your team
                  and stay connected.
                </p>
              </div>

              <button
                className="new-message-button"
                onClick={() => {
                  setShowNewMessage(true);
                  void loadContacts();
                }}
              >
                <Plus size={18} />

                New message
              </button>

            </div>


            {/* BACKEND ERROR */}

            {error && (
              <div
                style={{
                  marginBottom: "12px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "#fee2e2",
                  color: "#b91c1c",
                  fontSize: "13px",
                }}
              >
                {error}
              </div>
            )}


            {/* MESSAGE PANEL */}

            <div className="messages-panel">

              {/* CONVERSATIONS */}

              <aside className="conversation-sidebar">

                <div className="conversation-search">

                  <Search size={18} />

                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchTerm}
                    onChange={(event) =>
                      setSearchTerm(
                        event.target.value
                      )
                    }
                  />

                </div>


                <div className="conversation-title">

                  <span>
                    Conversations
                  </span>

                  <span className="conversation-count">
                    {
                      filteredConversations.length
                    }
                  </span>

                </div>


                <div className="conversation-list">

                  {filteredConversations.length ===
                  0 ? (
                    <div className="no-conversations">
                      <p>
                        No conversations found.
                      </p>
                    </div>
                  ) : (
                    filteredConversations.map(
                      (conversation) => (
                        <button
                          key={
                            conversation.id
                          }
                          className={`conversation-item ${
                            selectedId ===
                            conversation.id
                              ? "active"
                              : ""
                          }`}
                          onClick={() =>
                            selectConversation(
                              conversation.id
                            )
                          }
                        >

                          <div className="conversation-avatar">
                            {
                              conversation.avatar
                            }
                          </div>


                          <div className="conversation-content">

                            <div className="conversation-top">

                              <strong>
                                {
                                  conversation.name
                                }
                              </strong>

                              <span>
                                {
                                  conversation.time
                                }
                              </span>

                            </div>


                            <div className="conversation-bottom">

                              <p>
                                {
                                  conversation.lastMessage
                                }
                              </p>

                              {conversation.unread >
                                0 && (
                                <span className="unread-badge">
                                  {
                                    conversation.unread
                                  }
                                </span>
                              )}

                            </div>

                          </div>

                        </button>
                      )
                    )
                  )}

                </div>

              </aside>


              {/* CHAT */}

              {selectedConversation ? (
                <section className="chat-section">

                  {/* CHAT HEADER */}

                  <div className="chat-header">

                    <div className="chat-user-info">

                      <div className="chat-avatar">
                        {
                          selectedConversation.avatar
                        }
                      </div>

                      <div>

                        <h2>
                          {
                            selectedConversation.name
                          }
                        </h2>

                        <p>
                          {
                            selectedConversation.role
                          }
                        </p>

                      </div>

                    </div>


                    <div className="chat-actions">

                      <button
                        title="Call"
                        type="button"
                        aria-label="Start audio call"
                        disabled={Boolean(callSession) || callBusy}
                        onClick={() => void startCall("audio")}
                      >
                        <Phone size={18} />
                      </button>

                      <button
                        title="Video call"
                        type="button"
                        aria-label="Start video call"
                        disabled={Boolean(callSession) || callBusy}
                        onClick={() => void startCall("video")}
                      >
                        <Video size={19} />
                      </button>

                      <button
                        title="More"
                        type="button"
                        aria-label="Conversation actions"
                        aria-expanded={showChatMenu}
                        onClick={() => setShowChatMenu((open) => !open)}
                      >
                        <MoreVertical
                          size={19}
                        />
                      </button>

                      {showChatMenu && (
                        <div className="chat-more-menu" role="menu">
                          <button type="button" role="menuitem" onClick={() => { setShowConversationDetails(true); setShowChatMenu(false); }}>
                            Conversation details
                          </button>
                          <button type="button" role="menuitem" onClick={() => { setSearchTerm(selectedConversation.name); setShowChatMenu(false); }}>
                            Find in conversations
                          </button>
                        </div>
                      )}

                    </div>

                  </div>


                  {/* CHAT MESSAGES */}

                  <div className="chat-messages" ref={chatMessagesRef}>

                    <div className="chat-date">
                      Today
                    </div>


                    {loading ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "30px",
                          color: "#6b7280",
                          fontSize: "13px",
                        }}
                      >
                        Loading messages...
                      </div>
                    ) : (
                      selectedConversation.messages.map(
                        (message) => (
                          <div
                            key={
                              message.id
                            }
                            className={`message-row ${
                              message.sent
                                ? "sent"
                                : "received"
                            }`}
                          >

                            <div className="message-bubble">

                              {message.text && <p>{message.text}</p>}
                              {message.attachmentUrl && (
                                <a className="message-attachment" href={message.attachmentUrl} onClick={async (event) => {
                                  event.preventDefault();
                                  try {
                                    const response = await fetch(message.attachmentUrl!, { headers: { Authorization: `Bearer ${getToken()}` } });
                                    if (!response.ok) throw new Error("Download failed.");
                                    const objectUrl = URL.createObjectURL(await response.blob());
                                    const link = document.createElement("a");
                                    link.href = objectUrl;
                                    link.download = message.attachmentName || "attachment";
                                    link.click();
                                    URL.revokeObjectURL(objectUrl);
                                  } catch {
                                    setError("Could not download this attachment.");
                                  }
                                }}>
                                  <Paperclip size={15} /> {message.attachmentName || "Download attachment"}
                                </a>
                              )}

                              <div className="message-meta">

                                <span>
                                  {
                                    message.time
                                  }
                                </span>

                                {message.sent && (
                                  <CheckCheck
                                    size={14}
                                  />
                                )}

                              </div>

                            </div>

                          </div>
                        )
                      )
                    )}

                  </div>


                  {/* INPUT */}

                  <div className="message-input-area">

                    <input
                      ref={fileInputRef}
                      className="hidden-file-input"
                      type="file"
                      accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        if (file && file.size > 10 * 1024 * 1024) {
                          setError("Files must be 10 MB or smaller.");
                          event.target.value = "";
                          return;
                        }
                        setError("");
                        setSelectedFile(file);
                      }}
                    />

                    <button
                      className="message-tool-button"
                      title="Attach file"
                      aria-label="Attach file"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip size={19} />
                    </button>


                    <div className="message-input-wrapper">

                      {selectedFile && (
                        <div className="selected-file-chip" title={selectedFile.name}>
                          <Paperclip size={14} />
                          <span>{selectedFile.name}</span>
                          <button type="button" aria-label="Remove attachment" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}><X size={14} /></button>
                        </div>
                      )}

                      <input
                        ref={messageInputRef}
                        type="text"
                        placeholder="Type a message..."
                        value={messageText}
                        onChange={(event) =>
                          setMessageText(
                            event.target.value
                          )
                        }
                        onKeyDown={
                          handleKeyDown
                        }
                        disabled={sending}
                      />

                      <button
                        className="emoji-button"
                        title="Emoji"
                        aria-label="Choose emoji"
                        type="button"
                        onClick={() => setEmojiOpen((open) => !open)}
                      >
                        <Smile size={19} />
                      </button>

                      {emojiOpen && (
                        <div className="emoji-picker" role="listbox" aria-label="Emoji picker">
                          {EMOJIS.map((emoji) => <button type="button" key={emoji} onClick={() => { setMessageText((text) => `${text}${emoji}`); setEmojiOpen(false); messageInputRef.current?.focus(); }}>{emoji}</button>)}
                        </div>
                      )}

                    </div>


                    <button
                      className="send-message-button"
                      onClick={
                        sendMessage
                      }
                      disabled={
                        (!messageText.trim() && !selectedFile) ||
                        sending
                      }
                      title="Send message"
                      type="button"
                    >
                      <Send size={18} />
                    </button>

                  </div>

                </section>
              ) : (
                <section className="empty-chat">

                  <div className="empty-chat-icon">
                    <Send size={28} />
                  </div>

                  <h2>
                    Select a conversation
                  </h2>

                  <p>
                    Choose a conversation to
                    start messaging.
                  </p>

                </section>
              )}

            </div>

          </div>

        </main>

      </div>


      {callSession && (
        <div className="call-overlay" role="dialog" aria-modal="true" aria-label="Voice or video call">
          <div className="call-card">
            <div className="call-avatar">{getInitials(callSession.name)}</div>
            <h2>{callSession.name}</h2>
            <p>{callSession.direction === "incoming" ? "Incoming" : "Outgoing"} {callSession.type} call · {callSession.status === "active" ? "Connected" : "Ringing…"}</p>
            {callSession.type === "video" && (
              <div className="call-video-stage">
                <video ref={remoteVideoRef} autoPlay playsInline />
                <video ref={localVideoRef} autoPlay playsInline muted />
              </div>
            )}
            {callSession.type === "audio" && <audio ref={remoteAudioRef} autoPlay />}
            <div className="call-controls">
              {callSession.direction === "incoming" && callSession.status === "ringing" && (
                <button className="answer-call-button" type="button" disabled={callBusy} onClick={() => void answerCall()}>{callBusy ? "Connecting…" : "Answer"}</button>
              )}
              <button className="end-call-button" type="button" disabled={callBusy} onClick={() => void endCall()}>{callSession.direction === "incoming" && callSession.status === "ringing" ? "Decline" : "End call"}</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW MESSAGE MODAL */}

      {showNewMessage && (
        <div
          className="new-message-overlay"
          onClick={() =>
            setShowNewMessage(false)
          }
        >

          <div
            className="new-message-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="new-message-header">

              <div>

                <h2>
                  New message
                </h2>

                <p>
                  Select a team member to
                  start a conversation.
                </p>

              </div>


              <button
                type="button"
                onClick={() =>
                  setShowNewMessage(false)
                }
              >
                ×
              </button>

            </div>


            <div className="new-message-people">

              {contactsLoading ? (
                <p className="new-message-empty">Loading workspace members…</p>
              ) : contacts.length === 0 ? (
                <p className="new-message-empty">There are no other registered workspace members yet.</p>
              ) : contacts.map(
                (contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    className="new-message-person"
                    onClick={() => startConversation(contact)}
                  >

                    <div className="conversation-avatar">
                      {getInitials(contact.name)}
                    </div>

                    <div>

                      <strong>{contact.name}</strong>
                      <span>{contact.email}</span>

                    </div>

                  </button>
                )
              )}

            </div>

          </div>

        </div>
      )}

      {showConversationDetails && selectedConversation && (
        <div className="new-message-overlay" onClick={() => setShowConversationDetails(false)}>
          <div className="conversation-details-modal" role="dialog" aria-modal="true" aria-label="Conversation details" onClick={(event) => event.stopPropagation()}>
            <div className="new-message-header">
              <div><h2>Conversation details</h2><p>Contact information for this chat.</p></div>
              <button type="button" aria-label="Close details" onClick={() => setShowConversationDetails(false)}><X size={18} /></button>
            </div>
            <div className="conversation-detail-person">
              <div className="conversation-avatar">{selectedConversation.avatar}</div>
              <div><strong>{selectedConversation.name}</strong><span>{selectedConversation.role}</span></div>
            </div>
            <p className="conversation-detail-count">{selectedConversation.messages.length} messages in this conversation</p>
          </div>
        </div>
      )}

    </div>
  );
}

export default Messages;
