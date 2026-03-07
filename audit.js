const fs = require('fs');
const path = require('path');

const rootDir = process.argv[2] || '.';

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });

    return arrayOfFiles.filter(f => !f.includes('node_modules'));
}

const allFiles = getAllFiles(rootDir);
console.log(`\n============ VERIFICAÇÃO 1: LISTA DE ARQUIVOS (${allFiles.length}) ============`);
allFiles.forEach(f => console.log(f));

console.log('\n============ VERIFICAÇÃO 2: IMPORTAÇÕES QUEBRADAS ============');
const exportedSymbolsCache = {}; // filename -> string[]

// Helper para pegar "basename" exportado de um arquivo
function getExportedSymbols(filepath) {
    if (exportedSymbolsCache[filepath]) return exportedSymbolsCache[filepath];

    let exports = [];
    try {
        const content = fs.readFileSync(filepath, 'utf8');
        // Mocks simple export matching
        const exportRegex = /export\s+(const|function|let|class|type|interface)\s+([a-zA-Z0-9_]+)/g;
        let match;
        while ((match = exportRegex.exec(content)) !== null) {
            exports.push(match[2]);
        }
        // Check for default exports
        if (content.match(/export\s+default\s+/)) {
            exports.push('default');
        }
        // Component exports like export const Dashboard ...
    } catch (e) { }
    exportedSymbolsCache[filepath] = exports;
    return exports;
}

allFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');

    // Regex to find imports: import { X, Y } from './path'
    const importRegex = /import\s+({[^}]+}|[a-zA-Z0-9_]+)?\s*(?:\*\s*as\s+[a-zA-Z0-9_]+)?\s*(?:from)?\s*['"]([^'"]+)['"]/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) {
        const symbolsRaw = match[1];
        const importPath = match[2];

        // Ignore node_modules
        if (!importPath.startsWith('.')) continue;

        const absoluteImportPathBase = path.resolve(path.dirname(file), importPath);
        let resolvedFile = null;

        // Check possible extensions
        for (const ext of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
            if (fs.existsSync(absoluteImportPathBase + ext)) {
                resolvedFile = absoluteImportPathBase + ext;
                break;
            }
        }

        if (!resolvedFile) {
            console.log(`QUEBRADO | ARQUIVO: ${file} | IMPORT PATH: ${importPath} | ERRO: Arquivo não existe`);
            continue;
        }

        if (symbolsRaw && symbolsRaw.startsWith('{')) {
            const symbols = symbolsRaw.replace(/[{}]/g, '').split(',').map(s => s.trim().split(' as ')[0]);
            const exported = getExportedSymbols(resolvedFile);
            for (const sym of symbols) {
                if (sym && !exported.includes(sym)) {
                    // Check if it's maybe exporting everything from somewhere else? Simplistic check.
                    const targetContent = fs.readFileSync(resolvedFile, 'utf8');
                    if (!targetContent.includes(`export * from`) && !targetContent.includes(`export { ${sym}`)) {
                        console.log(`ALERTA | ARQUIVO: ${file} | IMPORT PATH: ${importPath} | SÍMBOLO: ${sym} | ERRO: Símbolo não encontrado nas exports explícitas (Pode ser falso positivo se re-exportado)`);
                    }
                }
            }
        }
    }
});

console.log('\n============ VERIFICAÇÃO 3: BOTOES SEM AÇÃO REAL ============');
allFiles.forEach(file => {
    if (!file.endsWith('.tsx')) return;
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, i) => {
        if (line.includes('onClick={') || line.includes('onClick={()')) {
            if (line.includes('() => {}') || line.includes('console.log')) {
                console.log(`AVISO | ARQUIVO: ${path.basename(file)} | LINHA ${i + 1} | onClick vazio ou apenas console.log`);
            }
        }
    });
});

console.log('\n============ VERIFICAÇÃO 4: ESTADOS SEM USO (SIMPLES) ============');
allFiles.forEach(file => {
    if (!file.endsWith('.tsx')) return;
    const content = fs.readFileSync(file, 'utf8');

    const stateRegex = /const\s+\[\s*([a-zA-Z0-9_]+)\s*,\s*set[a-zA-Z0-9_]+\s*\]\s*=\s*useState/g;
    let match;
    while ((match = stateRegex.exec(content)) !== null) {
        const stateName = match[1];
        // Count occurrences of the stateName in the file
        // If it's only 1 (the declaration), it's unused.
        const escapedStateName = stateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const varRegex = new RegExp(`\\b${escapedStateName}\\b`, 'g');
        const matches = content.match(varRegex);
        if (matches && matches.length === 1) {
            console.log(`ÓRFÃO | ARQUIVO: ${path.basename(file)} | ESTADO: ${stateName} nunca é lido.`);
        }
    }
});
