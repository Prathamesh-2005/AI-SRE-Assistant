import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [prompt, setPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!prompt.trim()) return;

    // Add user message to UI
    const newChat = [...chatHistory, { sender: 'user', text: prompt }];
    setChatHistory(newChat);
    setPrompt('');
    setIsLoading(true);

    try {
      // Call your Spring Boot Agent
      const response = await axios.get(`http://localhost:8080/api/investigate`, {
        params: { prompt: prompt }
      });

      // Add agent response to UI
      setChatHistory([...newChat, { sender: 'agent', text: response.data }]);
    } catch (error) {
      setChatHistory([...newChat, { sender: 'agent', text: 'Error connecting to Agent. Is Spring Boot running?' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans">
      
      {/* Header */}
      <header className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold text-blue-400 tracking-wider">⚡ AI SRE COMMAND CENTER</h1>
        <span className="text-sm bg-green-900 text-green-400 px-3 py-1 rounded-full border border-green-700">
          Agent Status: Online
        </span>
      </header>

      {/* Main Split Screen */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Panel: The Investigation Chat */}
        <div className="w-1/2 flex flex-col border-r border-gray-700 bg-gray-900">
          <div className="bg-gray-800 text-xs text-gray-400 p-2 uppercase font-semibold tracking-widest border-b border-gray-700">
            Investigation Chat
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {chatHistory.length === 0 && (
              <div className="text-gray-500 italic mt-10 text-center">
                System nominal. Enter an incident report to begin investigation.
              </div>
            )}
            
            {chatHistory.map((msg, index) => (
              <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xl p-4 rounded-lg shadow-md whitespace-pre-wrap ${
                  msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 border border-gray-700 text-gray-200'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 border border-gray-700 text-blue-400 p-4 rounded-lg shadow-md animate-pulse">
                  Agent is investigating live databases...
                </div>
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="p-4 bg-gray-800 border-t border-gray-700 flex gap-4">
            <input
              type="text"
              className="flex-1 bg-gray-900 border border-gray-600 rounded px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="e.g., The orders table is timing out..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded font-bold transition-colors disabled:opacity-50"
            >
              SEND
            </button>
          </div>
        </div>

        {/* Right Panel: The Agent Console (Placeholder for Phase 5) */}
        <div className="w-1/2 bg-black flex flex-col">
          <div className="bg-gray-800 text-xs text-gray-400 p-2 uppercase font-semibold tracking-widest border-b border-gray-700">
            Live Tool Execution Logs
          </div>
          <div className="p-6 font-mono text-sm text-green-400 space-y-2 overflow-y-auto">
            <div>&gt; System initialized.</div>
            <div>&gt; Awaiting incident input...</div>
            {isLoading && (
              <>
                <div className="text-yellow-400 mt-4">&gt; Intercepted prompt. Formulating plan...</div>
                <div className="text-blue-400">&gt; Triggering MCP Tool: checkRunningQueries()</div>
                <div className="text-blue-400">&gt; Triggering MCP Tool: checkDatabaseLocks()</div>
                <div className="text-purple-400">&gt; Querying Qdrant Vector Store...</div>
              </>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}

export default App;