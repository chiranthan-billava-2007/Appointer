import { useState } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";

const suggestions = ["Find a specialist", "Prepare questions", "Understand next steps"];

function AIAssistant() {
  const [message, setMessage] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  return <PublicLayout><section className="assistant-page"><div className="assistant-header"><p className="eyebrow">APPOINTER ASSISTANT</p><h1>Plan your next appointment.</h1><p>Use this guided interface to prepare questions and appointment preferences. It is a frontend-only preview.</p></div><div className="chat-panel"><div className="assistant-message"><span>✦</span><p>Hi! I can help you prepare for your appointment. What would you like to organize today?</p></div>{sentMessage && <div className="user-message"><p>{sentMessage}</p></div>}<div className="suggestion-row">{suggestions.map(suggestion => <button type="button" onClick={() => setMessage(suggestion)} key={suggestion}>{suggestion}</button>)}</div><form className="chat-input" onSubmit={event => { event.preventDefault(); if (message.trim()) { setSentMessage(message.trim()); setMessage(""); } }}><input value={message} onChange={event => setMessage(event.target.value)} placeholder="Type a question..." aria-label="Assistant message" /><button aria-label="Send message" type="submit">→</button></form></div><Link to="/doctors" className="back-link">Prefer to browse doctors? Explore the directory →</Link></section></PublicLayout>;
}

export default AIAssistant;
