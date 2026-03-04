import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2, Navigation, AlertCircle } from 'lucide-react';

interface Props {
  onChange: (val: string) => void;
}

declare global {
  interface Window {
    google: any;
  }
}

const AddressInput: React.FC<Props> = ({ onChange }) => {
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  
  const [loadingCep, setLoadingCep] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  
  // Dados do Endereço
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [cep, setCep] = useState('');

  // Notifica o componente pai sempre que um campo muda
  useEffect(() => {
    if (logradouro) {
      const enderecoCompleto = `${logradouro}, Nº ${numero}${complemento ? ` (${complemento})` : ''} - ${bairro}, ${cidade}/${uf} - CEP: ${cep}`;
      onChange(enderecoCompleto);
    }
  }, [logradouro, numero, complemento, bairro, cidade, uf, cep, onChange]);

  // Inicializa o Google Places Autocomplete
  useEffect(() => {
    const checkGoogle = setInterval(() => {
      if (window.google && window.google.maps && window.google.maps.places && autocompleteInputRef.current) {
        setGoogleLoaded(true);
        clearInterval(checkGoogle);

        const autocomplete = new window.google.maps.places.Autocomplete(autocompleteInputRef.current, {
          types: ['address'],
          componentRestrictions: { country: 'br' },
          fields: ['address_components', 'formatted_address', 'geometry']
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          fillInAddress(place);
        });
      }
    }, 500);

    return () => clearInterval(checkGoogle);
  }, []);

  const fillInAddress = (place: any) => {
    if (!place.address_components) return;

    let street = '';
    let number = '';
    let neighborhood = '';
    let city = '';
    let state = '';
    let postalCode = '';

    for (const component of place.address_components) {
      const componentType = component.types[0];

      switch (componentType) {
        case 'street_number':
          number = component.long_name;
          break;
        case 'route':
          street = component.long_name;
          break;
        case 'sublocality_level_1':
          neighborhood = component.long_name;
          break;
        case 'administrative_area_level_2':
          city = component.long_name;
          break;
        case 'administrative_area_level_1':
          state = component.short_name;
          break;
        case 'postal_code':
          postalCode = component.long_name;
          break;
      }
    }

    setLogradouro(street);
    setNumero(number);
    setBairro(neighborhood);
    setCidade(city);
    setUf(state);
    setCep(postalCode);
    
    // Focar no número se ele não veio do Google
    if (!number) {
        document.getElementById('input-numero')?.focus();
    }
  };

  const buscarCep = async () => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
        alert("CEP inválido");
        return;
    }

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setLogradouro(data.logradouro);
        setBairro(data.bairro);
        setCidade(data.localidade);
        setUf(data.uf);
        setNumero(''); // Limpa número anterior para forçar preenchimento
        document.getElementById('input-numero')?.focus();
      } else {
        alert('CEP não encontrado na base do ViaCEP.');
      }
    } catch (error) {
      alert('Erro ao buscar CEP.');
    } finally {
      setLoadingCep(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
      {/* Header Visual */}
      <div className="flex items-center gap-2 mb-2 text-slate-800">
        <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
             <MapPin size={18} />
        </div>
        <h4 className="font-bold text-sm">Localização da Obra</h4>
      </div>

      {/* Google Input Principal */}
      <div className="relative">
        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Busca Inteligente (Google Maps)</label>
        <div className="relative">
            <input
                ref={autocompleteInputRef}
                type="text"
                placeholder={googleLoaded ? "Digite o endereço da obra..." : "Carregando Google Maps..."}
                disabled={!googleLoaded}
                defaultValue={logradouro} 
                className="w-full pl-10 pr-4 py-2.5 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50/20 text-slate-800 font-medium placeholder:font-normal"
            />
            <div className="absolute left-3 top-2.5 text-blue-400">
                <Search size={18} />
            </div>
        </div>
        {!googleLoaded && (
            <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
                <AlertCircle size={10} /> Chave API Google Maps necessária no index.html
            </p>
        )}
      </div>

      <div className="h-px bg-slate-100 w-full my-2"></div>

      {/* Grid de Detalhes */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        
        {/* Número */}
        <div className="md:col-span-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Número *</label>
            <input 
                id="input-numero"
                type="text" 
                value={numero}
                onChange={e => setNumero(e.target.value)}
                placeholder="123"
                className="w-full p-2 border border-slate-300 rounded font-bold text-slate-800 focus:border-blue-500 outline-none"
            />
        </div>

        {/* Complemento */}
        <div className="md:col-span-4">
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Complemento</label>
            <input 
                type="text" 
                value={complemento}
                onChange={e => setComplemento(e.target.value)}
                placeholder="Galpão B"
                className="w-full p-2 border border-slate-300 rounded text-slate-700 focus:border-blue-500 outline-none"
            />
        </div>

        {/* CEP com Botão de Busca */}
        <div className="md:col-span-6">
            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">CEP</label>
            <div className="flex gap-2">
                <input 
                    type="tel" 
                    value={cep}
                    onChange={e => setCep(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                    className="flex-1 p-2 border border-slate-300 rounded text-slate-700 focus:border-blue-500 outline-none"
                />
                <button 
                    onClick={buscarCep}
                    disabled={loadingCep}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 px-3 rounded flex items-center justify-center transition-colors"
                    title="Buscar endereço pelo CEP"
                >
                    {loadingCep ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                </button>
            </div>
        </div>

        {/* Campos de Leitura/Ajuste (Preenchidos autom) */}
        <div className="md:col-span-5">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Bairro</label>
            <input type="text" value={bairro} onChange={e => setBairro(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-slate-600 text-sm focus:bg-white transition-colors outline-none" />
        </div>
        <div className="md:col-span-5">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Cidade</label>
            <input type="text" value={cidade} onChange={e => setCidade(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-slate-600 text-sm focus:bg-white transition-colors outline-none" />
        </div>
        <div className="md:col-span-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">UF</label>
            <input type="text" value={uf} onChange={e => setUf(e.target.value)} maxLength={2} className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-slate-600 text-sm text-center font-bold focus:bg-white transition-colors outline-none" />
        </div>

      </div>

      {logradouro && (
          <div className="bg-emerald-50 border border-emerald-100 rounded p-2 flex items-start gap-2 text-xs text-emerald-800 animate-in fade-in">
             <Navigation size={14} className="mt-0.5" />
             <span className="font-medium">
                Endereço confirmado: 
                <span className="font-normal text-emerald-700 ml-1">
                   {logradouro}, {numero || '?'} - {bairro}, {cidade}/{uf}
                </span>
             </span>
          </div>
      )}
    </div>
  );
};

export default AddressInput;