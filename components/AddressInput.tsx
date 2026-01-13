import React, { useState } from 'react';
import { MapPin, Search, Loader2 } from 'lucide-react';

interface Props {
  onChange: (fullAddress: string) => void;
}

export const AddressInput: React.FC<Props> = ({ onChange }) => {
  const [cep, setCep] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ street: '', neighborhood: '', city: '', uf: '', number: '', complement: '' });

  const fetchCep = async () => {
    if (cep.replace(/\D/g, '').length !== 8) return;
    setLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const json = await res.json();
      if (!json.erro) {
        const newData = { ...data, street: json.logradouro, neighborhood: json.bairro, city: json.localidade, uf: json.uf };
        setData(newData);
        updateParent(newData);
      }
    } finally { setLoading(false); }
  };

  const updateParent = (currentData: typeof data) => {
    const full = `${currentData.street}, ${currentData.number} ${currentData.complement ? `(${currentData.complement})` : ''} - ${currentData.neighborhood}, ${currentData.city}/${currentData.uf}`;
    onChange(full);
  };

  const [validationError, setValidationError] = useState(false);

  const handleBlurNumber = () => {
    if (!data.number || data.number.trim() === '') {
      setValidationError(true);
    } else {
      setValidationError(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">CEP</label>
          <div className="relative">
            <input type="tel" value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" className="w-full p-2 border rounded text-sm" />
            <button onClick={fetchCep} className="absolute right-2 top-2 text-blue-600">{loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}</button>
          </div>
        </div>
        <div className="flex-[2]">
          <label className="text-[10px] font-bold text-gray-500 uppercase">Rua/Logradouro</label>
          <input type="text" value={data.street} onChange={(e) => { const n = { ...data, street: e.target.value }; setData(n); updateParent(n); }} className="w-full p-2 border rounded text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={`text-[10px] font-bold uppercase flex justify-between ${validationError ? 'text-red-600' : 'text-blue-600'}`}>
            Número * {validationError && <span>(Obrigatório)</span>}
          </label>
          <input
            type="text"
            value={data.number}
            onChange={(e) => {
              const n = { ...data, number: e.target.value };
              setData(n);
              updateParent(n);
              if (e.target.value) setValidationError(false);
            }}
            onBlur={handleBlurNumber}
            className={`w-full p-2 border-2 rounded text-sm font-bold ${validationError ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-blue-100 focus:border-blue-500'}`}
            placeholder="Ex: 123"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase">Complemento</label>
          <input type="text" value={data.complement} onChange={(e) => { const n = { ...data, complement: e.target.value }; setData(n); updateParent(n); }} className="w-full p-2 border rounded text-sm" placeholder="Apto/Bloco" />
        </div>
      </div>
    </div>
  );
};