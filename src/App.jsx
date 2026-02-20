import { useState } from 'react';
import './index.css';
import ChecklistForm from './pages/ChecklistForm';
import Dashboard from './pages/Dashboard';

const TABS = [
  { id: 'checklist', label: 'ฟอร์มตรวจ', icon: '📋' },
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
];

function App() {
  const [activeTab, setActiveTab] = useState('checklist');

  return (
    <div className="min-h-screen bg-gray-50 font-thai">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <div>
            <h1 className="text-base font-bold text-gray-800 leading-tight">ประหยัดพลังงาน</h1>
            <p className="text-[10px] text-gray-400">Energy Saving Campaign 2569</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 pt-4">
        {activeTab === 'checklist' ? (
          <ChecklistForm />
        ) : (
          <Dashboard key="dashboard" />
        )}
      </main>

      {/* Bottom Navigation — 2 tabs */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="max-w-4xl mx-auto flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center py-3 transition-colors duration-200 relative ${
                activeTab === tab.id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span
                className={`text-[11px] mt-1 ${
                  activeTab === tab.id ? 'font-semibold' : 'font-medium'
                }`}
              >
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default App;
