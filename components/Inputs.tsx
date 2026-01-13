import React, { useState, useEffect } from 'react';

// ----------------------------------------------------------------------
// 1. INPUT DE DINHEIRO (R$)
// ----------------------------------------------------------------------
// Formata automaticamente: Digita 1500 -> Vira R$ 15,00
// Teclado: Numérico puro
interface MoneyInputProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
  label?: string; // Added label prop
}

export const MoneyInput: React.FC<MoneyInputProps> = ({ value, onChange, className, placeholder, label }) => {
  const formatDisplay = (val: number) => {
    if (val === 0 && !placeholder) return 'R$ 0,00';
    if (val === 0 && placeholder) return '';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numberValue = Number(rawValue) / 100;
    onChange(numberValue);
  };

  return (
    <div className={className}>
      {label && <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">{label}</label>}
      <input
        type="text"
        inputMode="numeric"
        value={formatDisplay(value)}
        onChange={handleChange}
        placeholder={placeholder || "R$ 0,00"}
        className="w-full p-2 border rounded text-sm"
      />
    </div>
  );
};

interface DecimalInputProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
  label?: string; // Added label prop
}

export const DecimalInput: React.FC<DecimalInputProps> = ({ value, onChange, className, placeholder, label }) => {
  const [localValue, setLocalValue] = useState(value > 0 ? value.toString().replace('.', ',') : '');

  useEffect(() => {
    if (value === 0 && localValue === '') return;
    const currentFloat = parseFloat(localValue.replace(',', '.') || '0');
    if (currentFloat !== value) {
      setLocalValue(value > 0 ? value.toString().replace('.', ',') : '');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputVal = e.target.value;
    inputVal = inputVal.replace(/[^0-9,]/g, '');
    const parts = inputVal.split(',');
    if (parts.length > 2) return;

    setLocalValue(inputVal);
    const floatVal = parseFloat(inputVal.replace(',', '.'));
    onChange(isNaN(floatVal) ? 0 : floatVal);
  };

  return (
    <div className={className}>
      {label && <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">{label}</label>}
      <input
        type="text"
        inputMode="decimal"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder || "0"}
        className="w-full p-2 border rounded text-sm"
      />
    </div>
  );
};