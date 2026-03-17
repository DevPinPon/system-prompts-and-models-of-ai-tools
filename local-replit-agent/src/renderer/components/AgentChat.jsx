import React, { useState, useRef, useEffect } from 'react';

function EventMessage({ event }) {
  const styles = {
    thinking: { color: 'var(--mauve)', icon: '🔮' },
    tool_call: { color: 'var(--yellow)', icon: '⚡' },
    command_start: { color: 'var(--peach)', icon: '▶' },
    command_complete: { color: 'var(--green)', icon: '✓' },
    file_created: { color: 'var(--green)', icon: '+' },
    file_edited: { color: 'var(--yellow)', icon: '~' },
    file_deleted: { color: 'var(--red)', icon: '-' },
    progress: { color: 'var(--accent)', icon: '📊' },
    error: { color: 'var(--red)', icon: '✗' },
    complete: { color: 'var(--green)', icon: '✓' },
    stopped: { color: 'var(--text-muted)', icon: '⏹' },
  };

  const style = styles[event.type] || { color: 'var(--text-secondary)', icon: '•' };

  let content = '';
  switch (event.type) {
    case 'thinking':
      content = event.message;
      break;
    case 'tool_call':
      content = `Using tool: ${event.tool}`;
      break;
    case 'command_start':
      content = `Running: ${event.command}`;
      break;
    case 'command_complete':
      content = event.output ? `Output: ${event.output.slice(0, 200)}` : 'Command completed';
      break;
    case 'file_created':
      content = `Created: ${event.path}`;
      break;
    case 'file_edited':
      content = `Edited: ${event.path}`;
      break;
    case 'file_deleted':
      content = `Deleted: ${event.path}`;
      break;
    case 'progress':
      content = event.summary;
      break;
    case 'error':
      content = event.message;
      break;
    case 'complete':
    case 'stopped':
      content = event.message;
      break;
    default:
      content = JSON.stringify(event);
  }

  return (
    <div style={{
      padding: '6px 12px',
      fontSize: 12,
      fontFamily: 'var(--font-mono)',
      color: style.color,
      borderLeft: `2px solid ${style.color}`,
      marginLeft: 8,
      background: 'rgba(0,0,0,0.15)',
      borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
      wordBreak: 'break-word',
    }}>
      <span style={{ marginRight: 6 }}>{style.icon}</span>
      {content}
    </div>
  );
}

function ChatMessage({ message }) {
  return (
    <div style={{
      padding: '10px 14px',
      borderRadius: 'var(--radius)',
      maxWidth: '95%',
      background: message.role === 'user' ? 'var(--bg-surface)' : 'transparent',
      alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
      color: 'var(--text-primary)',
      fontSize: 13,
      lineHeight: 1.6,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    }}>
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        color: message.role === 'user' ? 'var(--accent)' : 'var(--mauve)',
        marginBottom: 4,
        letterSpacing: '0.5px',
      }}>
        {message.role === 'user' ? 'You' : 'Agent'}
      </div>
      {message.content}
    </div>
  );
}

export default function AgentChat({ projectPath, events, onEventsChange }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState('chat'); // chat, autonomous
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, events]);

  const sendMessage = async () => {
    if (!input.trim() || isRunning) return;
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsRunning(true);
    onEventsChange([]);

    try {
      let result;
      if (mode === 'autonomous') {
        result = await window.api.agent.planAndExecute(userMessage, projectPath);
      } else {
        const history = messages.map(m => ({
          role: m.role,
          content: m.content,
        }));
        result = await window.api.agent.chat(userMessage, projectPath, history);
      }

      if (result.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: result.response }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err.message}`,
      }]);
    } finally {
      setIsRunning(false);
    }
  };

  const stopAgent = async () => {
    await window.api.agent.stop();
    setIsRunning(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontWeight: 600, fontSize: 12, textTransform: 'uppercase',
          letterSpacing: '0.5px', color: 'var(--text-muted)',
        }}>
          AI Agent
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setMode('chat')}
            style={{
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 11,
              background: mode === 'chat' ? 'var(--accent)' : 'var(--bg-surface)',
              color: mode === 'chat' ? 'var(--bg-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
            }}
          >
            Chat
          </button>
          <button
            onClick={() => setMode('autonomous')}
            style={{
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 11,
              background: mode === 'autonomous' ? 'var(--mauve)' : 'var(--bg-surface)',
              color: mode === 'autonomous' ? 'var(--bg-primary)' : 'var(--text-secondary)',
              fontWeight: 600,
            }}
          >
            Auto
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1,
        overflow: 'auto',
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {messages.length === 0 && events.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: 'var(--text-muted)',
            padding: '40px 16px',
            fontSize: 13,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              {mode === 'autonomous' ? 'Autonomous Mode' : 'Chat Mode'}
            </div>
            <div style={{ fontSize: 12 }}>
              {mode === 'autonomous'
                ? 'Describe what you want to build. The agent will plan and code autonomously.'
                : 'Ask questions or request code changes. The agent will assist you step by step.'}
            </div>
          </div>
        )}

        {messages.map((msg, i) => <ChatMessage key={i} message={msg} />)}

        {events.map((event, i) => <EventMessage key={i} event={event} />)}

        {isRunning && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            color: 'var(--mauve)',
            fontSize: 12,
          }}>
            <span className="spinner" style={{
              display: 'inline-block',
              width: 12,
              height: 12,
              border: '2px solid var(--mauve)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            Agent is working...
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        padding: 8,
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{
          display: 'flex',
          gap: 6,
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius)',
          padding: 4,
        }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={mode === 'autonomous'
              ? 'Describe what to build...'
              : 'Ask the agent anything...'}
            rows={2}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 13,
              resize: 'none',
              padding: '6px 8px',
              fontFamily: 'var(--font-sans)',
            }}
          />
          {isRunning ? (
            <button
              onClick={stopAgent}
              style={{
                padding: '6px 14px',
                background: 'var(--red)',
                color: 'var(--bg-primary)',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: 12,
                alignSelf: 'flex-end',
              }}
            >
              Stop
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              style={{
                padding: '6px 14px',
                background: input.trim() ? 'var(--accent)' : 'var(--bg-hover)',
                color: input.trim() ? 'var(--bg-primary)' : 'var(--text-muted)',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: 12,
                alignSelf: 'flex-end',
              }}
            >
              Send
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
