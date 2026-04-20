import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import './ChatWindow.css';

export default function ChatWindow({ messages, isLoading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="chat-window">
      <div className="chat-feed">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-row ${msg.role === 'user' ? 'chat-row-user' : 'chat-row-assistant'}`}>
            {msg.role === 'assistant' && <div className="chat-avatar">W</div>}

            <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>
              {msg.role === 'user' ? (
                <p>{msg.content}</p>
              ) : msg.content ? (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              ) : (
                <span className="chat-typing">
                  <span className="chat-dot" />
                  <span className="chat-dot" />
                  <span className="chat-dot" />
                </span>
              )}
            </div>

            {msg.role === 'user' && <div className="chat-avatar chat-avatar-user">U</div>}
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="chat-row chat-row-assistant">
            <div className="chat-avatar">W</div>
            <div className="chat-bubble chat-bubble-assistant chat-typing">
              <span className="chat-dot" />
              <span className="chat-dot" />
              <span className="chat-dot" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
