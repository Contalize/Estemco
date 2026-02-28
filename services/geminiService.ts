import { GoogleGenAI } from "@google/genai";
import { ConstructionSite } from "../types";

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface AnalysisResponse {
  text: string;
  sources: GroundingSource[];
}

const parseConstructionDataForPrompt = (site: ConstructionSite, dieselPrice: number): string => {
  const breakdown = site.data.map(d => `- ${d.name}: ${d.value}%`).join('\n');
  const margin = site.revenue > 0 ? ((site.revenue - site.totalCost) / site.revenue) * 100 : 0;
  const progress = site.contractMeters > 0 ? (site.executedMeters / site.contractMeters) * 100 : 0;
  const overbreak = site.concreteTheoreticalVol > 0 
    ? ((site.concreteRealVol - site.concreteTheoreticalVol) / site.concreteTheoreticalVol) * 100 
    : 0;
  
  return `
    Você é o Engenheiro Controller Sênior do Sistema Estemco.
    Audite o "Raio-X da Obra" abaixo. 
    USE O GOOGLE SEARCH para verificar se o preço do Diesel (R$ ${dieselPrice.toFixed(2)}) e do concreto estão alinhados com a média do mercado brasileiro atual para a região de ${site.address || 'São Paulo'}.
    
    DADOS DA OBRA:
    Nome: ${site.name}
    Progresso: ${progress.toFixed(1)}%
    Overbreak: ${overbreak.toFixed(1)}%
    Margem: ${margin.toFixed(1)}%
    
    DISTRIBUIÇÃO DE CUSTOS:
    ${breakdown}
    
    INSTRUÇÃO: Seja breve e militar. Se os preços de mercado estiverem subindo, alerte sobre a margem.
  `;
};

export const analyzeSiteHealth = async (site: ConstructionSite, dieselPrice: number): Promise<AnalysisResponse> => {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });
    const prompt = parseConstructionDataForPrompt(site, dieselPrice);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
      }
    });

    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) {
          sources.push({ title: chunk.web.title, uri: chunk.web.uri });
        }
      });
    }

    return {
      text: response.text || "Sem insights no momento.",
      sources: sources
    };
  } catch (error) {
    console.error("Search Grounding Error:", error);
    return { text: "Erro na auditoria via Search.", sources: [] };
  }
};

export const analyzeLogistics = async (site: ConstructionSite): Promise<AnalysisResponse> => {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });
    
    const prompt = `
      Analise a logística para a obra de fundação em: ${site.address || site.name}.
      Localização aproximada: Lat ${site.latitude}, Lng ${site.longitude}.
      
      Procure usando GOOGLE SEARCH:
      1. Encontrar as 3 usinas de concreto (Concrete Batch Plants) mais próximas.
      2. Verificar postos de combustível para abastecimento de máquinas.
      3. Identificar possíveis restrições de tráfego para caminhões pesados ou carretas de hélice contínua no entorno.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.maps) {
          sources.push({ title: chunk.maps.title || "Local no Mapa", uri: chunk.maps.uri });
        }
      });
    }

    return {
      text: response.text || "Sem dados logísticos encontrados.",
      sources: sources
    };
  } catch (error) {
    console.error("Maps Grounding Error:", error);
    return { text: "Erro na análise de logística via Maps.", sources: [] };
  }
};