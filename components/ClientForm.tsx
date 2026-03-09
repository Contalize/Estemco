import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Building2, User, Search, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Label, Select, Card } from './ui';

export type ClientFormData = {
  id?: string;
  tipoPessoa: 'PF' | 'PJ';
  nomeRazaoSocial: string;
  documento: string; // CPF ou CNPJ
  nomeFantasia?: string;
  email: string;
  telefone: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  enderecoFaturamento: string;
  contatos: {
    nome: string;
    cargo: string;
    telefone: string;
    email: string;
  }[];
};

interface ClientFormProps {
  initialData?: Partial<ClientFormData>;
  onSubmit: (data: ClientFormData) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export const ClientForm: React.FC<ClientFormProps> = ({ initialData, onSubmit, onCancel, isSaving }) => {
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  const { register, handleSubmit, watch, setValue, control, formState: { errors }, reset } = useForm<ClientFormData>({
    defaultValues: {
      tipoPessoa: 'PJ',
      contatos: [],
      ...initialData
    }
  });

  useEffect(() => {
    if (initialData) {
      reset({
        tipoPessoa: 'PJ',
        contatos: [],
        ...initialData
      });
    }
  }, [initialData, reset]);

  const { fields: contatosFields, append: appendContato, remove: removeContato } = useFieldArray({
    control,
    name: "contatos"
  });

  const tipoPessoa = watch('tipoPessoa');
  const documento = watch('documento');

  const handleSearchCnpj = async () => {
    if (!documento || documento.length < 14) return;

    const cleanCnpj = documento.replace(/\D/g, '');

    if (cleanCnpj.length !== 14) {
      alert('CNPJ inválido. Digite 14 números.');
      return;
    }

    setIsSearchingCnpj(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (!response.ok) throw new Error('CNPJ não encontrado');

      const data = await response.json();

      setValue('nomeRazaoSocial', data.razao_social || '');
      setValue('nomeFantasia', data.nome_fantasia || '');
      setValue('cep', data.cep || '');
      setValue('endereco', data.logradouro || '');
      setValue('numero', data.numero || '');
      setValue('complemento', data.complemento || '');
      setValue('bairro', data.bairro || '');
      setValue('cidade', data.municipio || '');
      setValue('uf', data.uf || '');
      setValue('telefone', data.ddd_telefone_1 || '');

      const fullAddress = `${data.logradouro || ''}, ${data.numero || ''}${data.complemento ? ' - ' + data.complemento : ''}, ${data.bairro || ''}, ${data.municipio || ''} - ${data.uf || ''}, ${data.cep || ''}`;
      setValue('enderecoFaturamento', fullAddress.replace(/^[,\s]+|[,\s]+$/g, '').replace(/,[,\s]*,/g, ','));

    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error);
      alert('Erro ao buscar CNPJ. Verifique o número e tente novamente.');
    } finally {
      setIsSearchingCnpj(false);
    }
  };

  const handleSearchCep = async () => {
    const cepValue = watch('cep');
    if (!cepValue) return;

    const cleanCep = cepValue.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsSearchingCep(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`);
      if (!response.ok) throw new Error('CEP não encontrado');

      const data = await response.json();

      setValue('endereco', data.street || '');
      setValue('bairro', data.neighborhood || '');
      setValue('cidade', data.city || '');
      setValue('uf', data.state || '');

      const currentFaturamento = watch('enderecoFaturamento');
      if (!currentFaturamento) {
        const fullAddress = `${data.street || ''}, , ${data.neighborhood || ''}, ${data.city || ''} - ${data.state || ''}, ${data.cep || ''}`;
        setValue('enderecoFaturamento', fullAddress.replace(/^[,\s]+|[,\s]+$/g, '').replace(/,[,\s]*,/g, ','));
      }

    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      alert('Erro ao buscar CEP. Verifique o número e tente novamente.');
    } finally {
      setIsSearchingCep(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="p-6">
        <form id="client-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-8">

          {/* TIPO DE PESSOA */}
          <div className="flex gap-4 p-1 bg-slate-100 rounded-lg w-fit">
            <label className={`flex items-center gap-2 px-4 py-2 rounded-md cursor-pointer text-sm font-medium transition-colors ${tipoPessoa === 'PF' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
              <input type="radio" value="PF" {...register('tipoPessoa')} className="hidden" />
              <User size={16} /> Pessoa Física
            </label>
            <label className={`flex items-center gap-2 px-4 py-2 rounded-md cursor-pointer text-sm font-medium transition-colors ${tipoPessoa === 'PJ' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
              <input type="radio" value="PJ" {...register('tipoPessoa')} className="hidden" />
              <Building2 size={16} /> Pessoa Jurídica
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label>{tipoPessoa === 'PJ' ? 'CNPJ' : 'CPF'}</Label>
              <div className="flex gap-2">
                <Input
                  placeholder={tipoPessoa === 'PJ' ? '00.000.000/0001-00' : '000.000.000-00'}
                  {...register('documento', { required: true })}
                  className="flex-1"
                />
                {tipoPessoa === 'PJ' && (
                  <Button type="button" variant="secondary" onClick={handleSearchCnpj} disabled={isSearchingCnpj} className="gap-2 whitespace-nowrap">
                    {isSearchingCnpj ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    Buscar
                  </Button>
                )}
              </div>
              {errors.documento && <span className="text-xs text-red-500 mt-1">Campo obrigatório</span>}
            </div>

            <div className="md:col-span-2">
              <Label>{tipoPessoa === 'PJ' ? 'Razão Social' : 'Nome Completo'}</Label>
              <Input placeholder="Nome oficial" {...register('nomeRazaoSocial', { required: true })} />
              {errors.nomeRazaoSocial && <span className="text-xs text-red-500 mt-1">Campo obrigatório</span>}
            </div>

            {tipoPessoa === 'PJ' && (
              <div className="md:col-span-2">
                <Label>Nome Fantasia</Label>
                <Input placeholder="Nome comercial" {...register('nomeFantasia')} />
              </div>
            )}

            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="contato@cliente.com" {...register('email', { required: true })} />
              {errors.email && <span className="text-xs text-red-500 mt-1">Campo obrigatório</span>}
            </div>
            <div>
              <Label>Telefone / WhatsApp</Label>
              <Input placeholder="(00) 00000-0000" {...register('telefone', { required: true })} />
              {errors.telefone && <span className="text-xs text-red-500 mt-1">Campo obrigatório</span>}
            </div>

            <div className="md:col-span-2">
              <Label>Endereço de Faturamento / Cobrança</Label>
              <Input placeholder="Endereço completo para emissão de NF e Contratos" {...register('enderecoFaturamento', { required: true })} />
              {errors.enderecoFaturamento && <span className="text-xs text-red-500 mt-1">Campo obrigatório</span>}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {isSearchingCep && (
                <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 rounded-lg">
                  <Loader2 className="animate-spin text-indigo-600" size={24} />
                </div>
              )}
              <div>
                <Label>CEP</Label>
                <Input placeholder="00000-000" {...register('cep')} onBlur={handleSearchCep} />
              </div>
              <div className="md:col-span-2">
                <Label>Logradouro / Endereço</Label>
                <Input placeholder="Rua, Avenida..." {...register('endereco')} />
              </div>
              <div>
                <Label>Número</Label>
                <Input placeholder="123" {...register('numero')} />
              </div>
              <div className="md:col-span-2">
                <Label>Complemento</Label>
                <Input placeholder="Sala, Andar, Galpão..." {...register('complemento')} />
              </div>
              <div>
                <Label>Bairro</Label>
                <Input placeholder="Bairro" {...register('bairro')} />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input placeholder="Cidade" {...register('cidade')} />
              </div>
              <div>
                <Label>UF</Label>
                <Input placeholder="SP" {...register('uf')} maxLength={2} />
              </div>
            </div>
          </div>

          {/* CONTATOS DA EMPRESA */}
          <div className="pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Contatos da Empresa</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => appendContato({ nome: '', cargo: '', telefone: '', email: '' })}
              >
                <Plus size={14} /> Adicionar Contato
              </Button>
            </div>

            <div className="space-y-4">
              {contatosFields.map((field, index) => (
                <Card key={field.id} className="p-4 bg-slate-50 border-slate-200 relative">
                  <button
                    type="button"
                    onClick={() => removeContato(index)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                  <h4 className="text-sm font-medium text-slate-700 mb-3">Contato {index + 1}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Nome</Label>
                      <Input placeholder="Nome do contato" {...register(`contatos.${index}.nome` as const, { required: true })} />
                    </div>
                    <div>
                      <Label>Cargo / Setor</Label>
                      <Select {...register(`contatos.${index}.cargo` as const, { required: true })}>
                        <option value="">Selecione...</option>
                        <option value="Financeiro">Financeiro</option>
                        <option value="Engenheiro">Engenheiro</option>
                        <option value="Diretor">Diretor</option>
                        <option value="Outro">Outro</option>
                      </Select>
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input placeholder="(00) 00000-0000" {...register(`contatos.${index}.telefone` as const)} />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input type="email" placeholder="email@exemplo.com" {...register(`contatos.${index}.email` as const)} />
                    </div>
                  </div>
                </Card>
              ))}
              {contatosFields.length === 0 && (
                <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 text-sm">
                  Nenhum contato adicional cadastrado.
                </div>
              )}
            </div>
          </div>

        </form>
      </div>

      <div className="border-t border-slate-200 p-4 bg-slate-50 flex justify-end gap-3 md:rounded-b-2xl sticky bottom-0 z-10">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" form="client-form" disabled={isSaving} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
          {isSaving && <Loader2 size={16} className="animate-spin" />}
          {isSaving ? 'Salvando...' : (initialData?.id ? 'Atualizar Cliente' : 'Salvar Cliente')}
        </Button>
      </div>
    </div>
  );
};
