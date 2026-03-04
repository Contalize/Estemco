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
    Você é o Engenheiro Controller Sênior da Estemco Engenharia.
    Audite financeiramente a obra: ${site.name}.
    
    DADOS ATUAIS DA OBRA:
    - Progresso Físico: ${progress.toFixed(1)}%
    - Desperdício de Concreto (Overbreak): ${overbreak.toFixed(1)}%
    - Margem de Contribuição Atual: ${margin.toFixed(1)}%
    - Preço do Diesel no Sistema: R$ ${dieselPrice.toFixed(2)}
    
    DISTRIBUIÇÃO DE CUSTOS:
    ${breakdown}
    
    TAREFA: 
    Use o GOOGLE SEARCH para verificar se o preço do diesel e do concreto em ${site.address || 'São Paulo'} estão subindo. 
    Compare com os dados da obra e dê um diagnóstico "Militar" (direto ao ponto) sobre o risco na margem.
  `;
};

export const analyzeSiteHealth = async (site: ConstructionSite, dieselPrice: number): Promise<AnalysisResponse> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
    const prompt = parseConstructionDataForPrompt(site, dieselPrice);

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      }
    });

    const sources: GroundingSource[] = [];
    const metadata = response.candidates?.[0]?.groundingMetadata;
    
    if (metadata?.groundingChunks) {
      metadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web) {
          sources.push({ title: chunk.web.title || "Fonte de Pesquisa", uri: chunk.web.uri });
        }
      });
    }

    return {
      text: response.text || "Análise indisponível no momento.",
      sources: sources
    };
  } catch (error) {
    console.error("Search Grounding Error:", error);
    return { text: "Erro ao conectar com o auditor de mercado.", sources: [] };
  }
};

export const analyzeLogistics = async (site: ConstructionSite): Promise<AnalysisResponse> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
    
    const prompt = `
      Analise a logística de entorno para a obra: ${site.name} em ${site.address}.
      Coordenadas: ${site.latitude}, ${site.longitude}.
      
      USE O GOOGLE MAPS PARA:
      1. Listar as 3 usinas de concreto mais próximas para reduzir frete.
      2. Identificar se o local fica em Zona de Restrição de Caminhões (ZMRC).
      3. Verificar acesso para carretas de transporte de perfuratrizes hélice contínua.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: site.latitude && site.longitude ? {
              latitude: site.latitude,
              longitude: site.longitude
            } : undefined
          }
        }
      }
    });

    const sources: GroundingSource[] = [];
    const metadata = response.candidates?.[0]?.groundingMetadata;
    
    if (metadata?.groundingChunks) {
      metadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.maps) {
          sources.push({ title: chunk.maps.title || "Local no Maps", uri: chunk.maps.uri });
        }
      });
    }

    return {
      text: response.text || "Análise logística não retornou dados.",
      sources: sources
    };
  } catch (error) {
    console.error("Maps Grounding Error:", error);
    return { text: "Erro ao acessar dados geo-localizados.", sources: [] };
  }
};