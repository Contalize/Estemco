import React, { useState } from 'react';
import { GlobalConfig, EmployeeCost } from '../types';
import { Save, Plus, Trash2, Fuel, Users, HardHat, Receipt } from 'lucide-react';
import { db } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

interface CostConfigProps {
  config: GlobalConfig;
  onUpdate: (newConfig: GlobalConfig) => void;
}

export const CostConfig: React.FC<CostConfigProps> = ({ config, onUpdate }) => {
  const [dieselPrice, setDieselPrice] = useState(config.dieselPrice);
  const [taxRateNF, setTaxRateNF] = useState(config.taxRateNF || 10);
  const [taxValueART, setTaxValueART] = useState(config.taxValueART || 99.96);
  const [employees, setEmployees] = useState<EmployeeCost[]>(config.employees);
  const [newRole, setNewRole] = useState('');
  const [newCost, setNewCost] = useState('');

  const handleSave = async () => {
    try {
      const newConfig = {
        dieselPrice,
        taxRateNF,
        taxValueART,
        employees
      };

      // Save locally
      onUpdate(newConfig);

      // Save to Firestore
      await setDoc(doc(db, 'metadata', 'config'), newConfig);

      alert('Base de custos atualizada no Banco de Dados!');
    } catch (error) {
      console.error("Error saving config:", error);
      alert('Erro ao salvar configuração.');
    }
  };

  const addEmployee = () => {
    if (newRole && newCost) {
      setEmployees([
        ...employees,
        {
          id: Date.now().toString(),
          role: newRole,
          dailyCost: parseFloat(newCost)
        }
      ]);
      setNewRole('');
      setNewCost('');
    }
  };

  const removeEmployee = (id: string) => {
    setEmployees(employees.filter(e => e.id !== id));
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <header className="mb-8 border-b border-slate-200 pb-6">
        <h2 className="text-3xl font-bold text-slate-800">Custos Padrão (Recursos)</h2>
        <p className="text-slate-500 mt-2">Definição dos valores base para cálculo automático de DRE por obra.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Diesel Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-amber-100 rounded-lg text-amber-600 shadow-sm">
              <Fuel size={28} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">Diesel S-10</h3>
              <p className="text-sm text-slate-500">Insumo Variável Crítico</p>
            </div>
          </div>

          <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <label className="block text-sm font-semibold text-slate-700">Preço Médio do Litro (R$)</label>
            <div className="relative rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-slate-500 sm:text-sm font-bold">R$</span>
              </div>
              <input
                type="number"
                step="0.01"
                className="block w-full rounded-md border-slate-300 pl-10 focus:border-blue-500 focus:ring-blue-500 py-3 border text-lg font-mono text-slate-700"
                value={dieselPrice}
                onChange={(e) => setDieselPrice(parseFloat(e.target.value))}
              />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              <span className="font-bold text-amber-600">Nota:</span> Este valor alimenta o cálculo de custo de máquinas no "Boletim Diário". Mantenha atualizado conforme a última nota fiscal de compra.
            </p>
          </div>
        </section>

        {/* Taxes & Fees Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-red-100 rounded-lg text-red-600 shadow-sm">
              <Receipt size={28} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">Impostos & Taxas</h3>
              <p className="text-sm text-slate-500">Parâmetros Fiscais Globais</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <label className="block text-sm font-semibold text-slate-700">Alíquota da Nota Fiscal (%)</label>
              <div className="relative rounded-md shadow-sm mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-slate-500 sm:text-sm font-bold">%</span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  className="block w-full rounded-md border-slate-300 pl-10 focus:border-red-500 focus:ring-red-500 py-3 border text-lg font-mono text-slate-700"
                  value={taxRateNF}
                  onChange={(e) => setTaxRateNF(parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <label className="block text-sm font-semibold text-slate-700">Valor da ART (R$)</label>
              <div className="relative rounded-md shadow-sm mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-slate-500 sm:text-sm font-bold">R$</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  className="block w-full rounded-md border-slate-300 pl-10 focus:border-red-500 focus:ring-red-500 py-3 border text-lg font-mono text-slate-700"
                  value={taxValueART}
                  onChange={(e) => setTaxValueART(parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-100 rounded-lg text-blue-600 shadow-sm">
              <Users size={28} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">Equipe de Campo</h3>
              <p className="text-sm text-slate-500">Custo Dia (Salário + Encargos)</p>
            </div>
          </div>

          <div className="space-y-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Cargo (ex: Operador)"
                className="rounded-md border-slate-300 border p-2.5 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Custo/Dia"
                  className="rounded-md border-slate-300 border p-2.5 text-sm w-full focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                />
                <button
                  onClick={addEmployee}
                  className="bg-blue-600 text-white p-2.5 rounded-md hover:bg-blue-700 flex items-center justify-center transition-colors shadow-sm"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Cargo</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Custo/Dia</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-700 flex items-center gap-2">
                      <HardHat size={14} className="text-slate-400" />
                      {emp.role}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">R$ {emp.dailyCost.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => removeEmployee(emp.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-500 italic">Nenhum custo de mão de obra cadastrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Assets Section Moved to Cadastros */}
      </div>

      <div className="flex justify-end pt-6 border-t border-slate-200">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
        >
          <Save size={20} />
          Salvar Parâmetros
        </button>
      </div>
    </div>
  );
};