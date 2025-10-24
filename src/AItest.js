import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default function AItest({
  defaultModel = 'gemini-2.5-flash',
  starter = '嗨！幫我測試一下台北旅遊的一日行程～',
}) {
  const [model, setModel] = useState(defaultModel);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [rememberKey, setRememberKey] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);

  // Load key from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('gemini_api_key');
    if (saved) setApiKey(saved);
  }, []);

  // Welcome message
  useEffect(() => {
    setHistory([{ role: 'model', parts: [{ text: "what's good bro? what u up to right now?" }] }]);
    if (starter) setInput(starter);
  }, [starter]);

  // auto scroll
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [history, loading]);

  const ai = useMemo(() => {
    try {
      return apiKey ? new GoogleGenerativeAI({ apiKey }) : null;
    } catch {
      return null;
    }
  }, [apiKey]);

  async function sendMessage(message) {
    const content = (message ?? input).trim();
    if (!content || loading) return;
    if (!ai) {
      setError('請先輸入有效的 Gemini API Key');
      return;
    }

    setError('');
    setLoading(true);

    const newHistory = [...history, { role: 'user', parts: [{ text: content }] }];
    setHistory(newHistory);
    setInput('');

    try {
      const modelInstance = ai.getGenerativeModel({ model });
      const chat = modelInstance.startChat({
        history: newHistory.map(m => ({
          role: m.role,
          parts: m.parts.map(p => ({ text: p.text })),
        })),
      });

      const result = await chat.sendMessage(content);
      const reply = result.response?.text() || '[No content]';
      setHistory(h => [...h, { role: 'model', parts: [{ text: reply }] }]);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  function renderMarkdownLike(text) {
    const lines = text.split(/\n/);
    return (
      <>
        {lines.map((ln, i) => (
          <div key={i} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{ln}</div>
        ))}
      </>
    );
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.header}>ur best bro（直連 SDK，白色玄幻風）</div>

        <div style={styles.controls}>
          <label style={styles.label}>
            <span>Model</span>
            <input
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="例如 gemini-2.5-flash、gemini-2.5-pro"
              style={styles.input}
            />
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              模型名稱會隨時間更新，若錯誤請改成官方清單中的有效 ID。
            </div>
          </label>

          <label style={styles.label}>
            <span>Gemini API Key</span>
            <input
              type="password"
              value={apiKey}
              onChange={e => {
                const v = e.target.value;
                setApiKey(v);
                if (rememberKey) localStorage.setItem('gemini_api_key', v);
              }}
              placeholder="貼上你的 API Key（只在本機瀏覽器儲存）"
              style={styles.input}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 12 }}>
              <input
                type="checkbox"
                checked={rememberKey}
                onChange={e => {
                  setRememberKey(e.target.checked);
                  if (!e.target.checked) localStorage.removeItem('gemini_api_key');
                  else if (apiKey) localStorage.setItem('gemini_api_key', apiKey);
                }}
              />
              <span>記住在本機（localStorage）</span>
            </label>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              Demo 用法：在瀏覽器內保存 Key 僅供教學。正式環境請改走後端或使用安全限制的 Key。
            </div>
          </label>
        </div>

        <div ref={listRef} style={styles.messages}>
          {history.map((m, idx) => (
            <div
              key={idx}
              style={{ ...styles.msg, ...(m.role === 'user' ? styles.user : styles.assistant) }}
            >
              <div style={styles.msgRole}>{m.role === 'user' ? 'You' : '你的好brother'}</div>
              <div style={styles.msgBody}>
                {renderMarkdownLike(m.parts.map(p => p.text).join('\n'))}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ ...styles.msg, ...styles.assistant }}>
              <div style={styles.msgRole}>你的好brother</div>
              <div style={styles.msgBody}>思考中…</div>
            </div>
          )}
        </div>

        {error && <div style={styles.error}>⚠ {error}</div>}

        <form
          onSubmit={e => {
            e.preventDefault();
            sendMessage();
          }}
          style={styles.composer}
        >
          <input
            placeholder="輸入訊息，按 Enter 送出"
            value={input}
            onChange={e => setInput(e.target.value)}
            style={styles.textInput}
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || !apiKey}
            style={styles.sendBtn}
          >
            送出
          </button>
        </form>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {['介紹喝酒的地方', '介紹打撞球的地方', '今晚去哪裏玩？'].map(q => (
            <button
              key={q}
              type="button"
              style={styles.suggestion}
              onClick={() => sendMessage(q)}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    display: 'grid',
    placeItems: 'start',
    padding: 20,
    background: 'radial-gradient(circle at 10% 10%, #ffffff 0%, #fbfdff 40%, #ffffff 100%)',
  },
  card: {
    width: 'min(920px, 100%)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(250,250,252,0.95))',
    border: '1px solid rgba(230,232,240,0.6)',
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0 8px 30px rgba(16,24,40,0.06), inset 0 1px 0 rgba(255,255,255,0.6)',
  },
  header: {
    padding: '14px 16px',
    fontWeight: 800,
    borderBottom: '1px solid rgba(230,232,240,0.6)',
    background: 'linear-gradient(90deg, rgba(255,255,255,0.6), rgba(255,255,255,0.8))',
    color: '#0f172a',
    letterSpacing: '0.6px',
    fontSize: 16,
  },
  controls: {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: '1fr 1fr',
    padding: 14,
  },
  label: { display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 },
  input: {
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid rgba(230,232,240,0.7)',
    fontSize: 14,
    background: 'rgba(255,255,255,0.8)',
  },
  messages: {
    padding: 14,
    display: 'grid',
    gap: 12,
    maxHeight: 460,
    overflow: 'auto',
  },
  msg: {
    borderRadius: 14,
    padding: 12,
    border: '1px solid rgba(230,232,240,0.6)',
    backdropFilter: 'blur(4px)',
  },
  user: {
    background:
      'linear-gradient(180deg, rgba(240,248,255,0.6), rgba(245,250,255,0.6))',
    borderColor: 'rgba(199,210,254,0.5)',
    boxShadow: '0 6px 18px rgba(99,102,241,0.06)',
  },
  assistant: {
    background:
      'linear-gradient(180deg, rgba(255,255,255,0.8), rgba(250,250,252,0.8))',
    borderColor: 'rgba(226,232,240,0.5)',
    boxShadow: '0 6px 18px rgba(15,23,42,0.04)',
  },
  msgRole: {
    fontSize: 12,
    fontWeight: 800,
    opacity: 0.85,
    marginBottom: 6,
    color: '#0f172a',
  },
  msgBody: { fontSize: 15, lineHeight: 1.6, color: '#0b1220' },
  error: { color: '#b91c1c', padding: '6px 12px' },
  composer: {
    padding: 14,
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: 10,
    borderTop: '1px solid rgba(230,232,240,0.6)',
  },
  textInput: {
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid rgba(230,232,240,0.7)',
    fontSize: 14,
    background: 'rgba(255,255,255,0.9)',
  },
  sendBtn: {
    padding: '10px 16px',
    borderRadius: 999,
    border: 'none',
    background: 'linear-gradient(90deg,#f59e0b,#f97316)',
    color: '#08121a',
    fontSize: 14,
    cursor: 'pointer',
    boxShadow: '0 6px 18px rgba(249,115,22,0.18)',
  },
  suggestion: {
    padding: '8px 12px',
    borderRadius: 999,
    border: '1px solid rgba(230,232,240,0.7)',
    background:
      'linear-gradient(180deg, rgba(255,255,255,0.9), rgba(250,250,252,0.9))',
    cursor: 'pointer',
    fontSize: 13,
    boxShadow: '0 6px 16px rgba(15,23,42,0.04)',
  },
};
