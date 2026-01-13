/**
 * LITHOLOGY LIBRARY & GEOTECHNICAL CONSTANTS
 * 
 * This file acts as the single source of truth for Soil Physics in the system.
 * It maps visual descriptions to calculation parameters for Aoki-Velloso and Decourt-Quaresma.
 */

export enum SoilCategory {
    SAND = 'AREIA',
    SILT = 'SILTE',
    CLAY = 'ARGILA',
}

export enum SoilType {
    AREIA = 'AREIA',
    AREIA_SILTOSA = 'AREIA_SILTOSA',
    AREIA_ARGILOSA = 'AREIA_ARGILOSA',
    SILTE = 'SILTE',
    SILTE_ARENOSO = 'SILTE_ARENOSO',
    SILTE_ARGILOSO = 'SILTE_ARGILOSO',
    ARGILA = 'ARGILA',
    ARGILA_ARENOSA = 'ARGILA_ARENOSA',
    ARGILA_SILTOSA = 'ARGILA_SILTOSA',
}

export interface GeotechnicalParams {
    name: string;
    category: SoilCategory;

    // Aoki-Velloso Method (1975)
    // K: Coeficiente de resistência de ponta (MPa)
    // Alpha: Razão de atrito lateral (%)
    aokiVelloso: {
        K: number;
        alpha: number;
    };

    // Décourt-Quaresma Method (1978)
    // C: Coeficiente característico do solo (kPa)
    decourtQuaresma: {
        C: number;
    };
}

export const SOIL_LIBRARY: Record<SoilType, GeotechnicalParams> = {
    [SoilType.AREIA]: {
        name: "Areia",
        category: SoilCategory.SAND,
        aokiVelloso: { K: 1.0, alpha: 0.14 },
        decourtQuaresma: { C: 400 }
    },
    [SoilType.AREIA_SILTOSA]: {
        name: "Areia Siltosa",
        category: SoilCategory.SAND,
        aokiVelloso: { K: 0.8, alpha: 0.20 },
        decourtQuaresma: { C: 350 } // Approx
    },
    [SoilType.AREIA_ARGILOSA]: {
        name: "Areia Argilosa",
        category: SoilCategory.SAND,
        aokiVelloso: { K: 0.5, alpha: 0.24 }, // K varies notably, using conservative mean
        decourtQuaresma: { C: 300 }
    },
    [SoilType.SILTE]: {
        name: "Silte",
        category: SoilCategory.SILT,
        aokiVelloso: { K: 0.4, alpha: 0.30 },
        decourtQuaresma: { C: 200 }
    },
    [SoilType.SILTE_ARENOSO]: {
        name: "Silte Arenoso",
        category: SoilCategory.SILT,
        aokiVelloso: { K: 0.55, alpha: 0.22 },
        decourtQuaresma: { C: 250 }
    },
    [SoilType.SILTE_ARGILOSO]: {
        name: "Silte Argiloso",
        category: SoilCategory.SILT,
        aokiVelloso: { K: 0.23, alpha: 0.34 },
        decourtQuaresma: { C: 150 }
    },
    [SoilType.ARGILA]: {
        name: "Argila",
        category: SoilCategory.CLAY,
        aokiVelloso: { K: 0.20, alpha: 0.60 },
        decourtQuaresma: { C: 120 }
    },
    [SoilType.ARGILA_ARENOSA]: {
        name: "Argila Arenosa",
        category: SoilCategory.CLAY,
        aokiVelloso: { K: 0.35, alpha: 0.24 }, // Can behave like sand sometimes
        decourtQuaresma: { C: 180 }
    },
    [SoilType.ARGILA_SILTOSA]: {
        name: "Argila Siltosa",
        category: SoilCategory.CLAY,
        aokiVelloso: { K: 0.22, alpha: 0.35 },
        decourtQuaresma: { C: 140 }
    }
};

export const getSoilParams = (type: SoilType): GeotechnicalParams => {
    return SOIL_LIBRARY[type] || SOIL_LIBRARY[SoilType.ARGILA]; // Fallback to safe clay
};

/**
 * Returns the Consistency (Clays) or Compactness (Sands) based on NBR 6484.
 */
export const getSoilConsistency = (nspt: number, type: SoilType): string => {
    const params = getSoilParams(type);

    if (params.category === SoilCategory.SAND || params.category === SoilCategory.SILT) {
        // Compactness (Compacidade) for Cohensionless Soils
        if (nspt <= 4) return "Fofa";
        if (nspt <= 8) return "Pouco Compacta";
        if (nspt <= 18) return "Média Compacta";
        if (nspt <= 40) return "Compacta";
        return "Muito Compacta";
    } else {
        // Consistency (Consistência) for Cohesive Soils
        if (nspt <= 2) return "Muito Mole";
        if (nspt <= 5) return "Mole";
        if (nspt <= 10) return "Média";
        if (nspt <= 19) return "Rija";
        return "Muito Rija"; // > 19 usually "Dura" implies NSPT > 30? Standard varies slightly, usually >19 is Hard/Dura
    }
};
