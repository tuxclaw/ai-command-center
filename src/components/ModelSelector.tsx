import React, { useEffect, useState, useRef } from 'react';
import { fetchModels, type OllamaModel } from '../lib/api';

interface Props {
  selectedModel: string;
  onSelect: (model: string) => void;
}

export default function ModelSelector({ selectedModel, onSelect }: Props) {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    loadModels();
  }, []);

  async function loadModels() {
    try {
      const m = await fetchModels();
      setModels(m);

      // Only auto-select once on first load
      if (!initializedRef.current && m.length > 0) {
        initializedRef.current = true;
        const saved = localStorage.getItem('selected-model');
        if (saved && m.find(model => model.name === saved)) {
          onSelect(saved);
        } else if (!selectedModel) {
          onSelect(m[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to load models:', err);
    }
    setLoading(false);
  }

  function formatSize(bytes: number): string {
    const gb = bytes / (1024 ** 3);
    return gb >= 1 ? `${gb.toFixed(1)}GB` : `${(bytes / (1024 ** 2)).toFixed(0)}MB`;
  }

  return (
    <select
      value={selectedModel}
      onChange={(e) => onSelect(e.target.value)}
      className="bg-dark-surface border border-dark-border text-gray-400 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
    >
      {loading && <option>Loading...</option>}
      {!loading && models.length === 0 && <option>No models found</option>}
      {models.map((m) => (
        <option key={m.name} value={m.name}>
          {m.name} ({formatSize(m.size)})
        </option>
      ))}
    </select>
  );
}
