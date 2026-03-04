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
}

export const MoneyInput: React.FC<MoneyInputProps> = ({ value, onChange, className, placeholder }) => {
  // Converte o número para string formatada R$
  const formatDisplay = (val: number) => {
    if (val === 0 && !placeholder) return 'R$ 0,00';
    if (val === 0 && placeholder) return '';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove tudo que não é dígito
    const rawValue = e.target.value.replace(/\D/g, '');
    
    // Divide por 100 para considerar os centavos
    const numberValue = Number(rawValue) / 100;
    
    onChange(numberValue);
  };

  return (
    <input
      type="text"
      inputMode="numeric" // Força teclado numérico no iOS/Android
      value={formatDisplay(value)}
      onChange={handleChange}
      placeholder={placeholder || "R$ 0,00"}
      className={className}
    />
  );
};

// ----------------------------------------------------------------------
// 2. INPUT DECIMAL (Metros, Quantidades)
// ----------------------------------------------------------------------
// Aceita vírgula como separador. Teclado com pontuação.
interface DecimalInputProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
}

export const DecimalInput: React.FC<DecimalInputProps> = ({ value, onChange, className, placeholder }) => {
  // Estado local para permitir digitar "12," antes de virar "12,5"
  const [localValue, setLocalValue] = useState(value > 0 ? value.toString().replace('.', ',') : '');

  // Sincroniza se o valor externo mudar (ex: resetar form)
  useEffect(() => {
    // Se o valor externo for 0 e o local for vazio, mantém vazio para UX limpa
    if (value === 0 && localValue === '') return;
    
    // Se o valor numérico mudou externamente, atualiza a string local
    const currentFloat = parseFloat(localValue.replace(',', '.') || '0');
    if (currentFloat !== value) {
        setLocalValue(value > 0 ? value.toString().replace('.', ',') : '');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputVal = e.target.value;
    
    // Permite apenas números e uma vírgula
    inputVal = inputVal.replace(/[^0-9,]/g, '');
    
    // Evita múltiplas vírgulas
    const parts = inputVal.split(',');
    if (parts.length > 2) return;

    setLocalValue(inputVal);

    // Converte para número (float) para salvar no estado global
    const floatVal = parseFloat(inputVal.replace(',', '.'));
    onChange(isNaN(floatVal) ? 0 : floatVal);
  };

  return (
    <input
      type="text"
      inputMode="decimal" // Teclado numérico com vírgula/ponto
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder || "0"}
      className={className}
    />
  );
};