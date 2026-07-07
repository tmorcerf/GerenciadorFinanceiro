const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'index.html');

try {
    let content = fs.readFileSync(indexPath, 'utf8');

    const regex = /(<span style="font-size: 0\.75rem;">)(v\s*\d+\.\d+\.)(\d{4})(?:.*?)?(<\/span>)/g;
    let updated = false;
    let newVersionString = "";

    content = content.replace(regex, (match, p1, prefix, buildNumber, p4) => {
        let nextBuild = parseInt(buildNumber, 10) + 1;
        let nextBuildStr = nextBuild.toString().padStart(4, '0');
        updated = true;
        
        let now = new Date();
        let dateStr = now.toLocaleString('pt-BR');
        
        newVersionString = `${prefix}${nextBuildStr}`;
        return `${p1}${newVersionString} - ${dateStr}${p4}`;
    });

    if (updated) {
        fs.writeFileSync(indexPath, content, 'utf8');
        console.log(`[Git Hook] Versão incrementada com sucesso para: ${newVersionString}`);
    }
} catch (error) {
    console.error(`[Git Hook] Erro ao tentar incrementar a versão: ${error.message}`);
}
