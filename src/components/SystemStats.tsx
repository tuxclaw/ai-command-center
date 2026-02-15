import React, { useEffect, useState } from 'react';
import { fetchSystemStats, type SystemStats as SystemStatsType } from '../lib/api';

export default function SystemStats() {
  const [info, setInfo] = useState<SystemStatsType | null>(null);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  async function load() {
    try {
      setInfo(await fetchSystemStats());
    } catch { /* ignore */ }
  }

  if (!info) return null;

  return (
    <div className="flex items-center gap-4 text-xs text-gray-400">
      <div className="flex items-center gap-1.5">
        <span>CPU</span>
        <div className="w-16 h-1.5 bg-dark-border rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${info.cpu_percent}%` }} />
        </div>
        <span>{info.cpu_percent.toFixed(0)}%</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span>RAM</span>
        <div className="w-16 h-1.5 bg-dark-border rounded-full overflow-hidden">
          <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${info.ram_percent}%` }} />
        </div>
        <span>{info.ram_percent.toFixed(0)}%</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${info.ollama_status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
        <span>Ollama {info.ollama_status}</span>
      </div>
    </div>
  );
}
