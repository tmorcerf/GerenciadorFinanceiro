const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'index.html');

try {
    let content = fs.readFileSync(indexPath, 'utf8');

    const versionRegex = /(v\s*\d+\.\d+\.)(\d{4})/g;
    let updated = false;
    let newVersionString = "";

    content = content.replace(versionRegex, (match, prefix, buildNumber) => {
        let nextBuild = parseInt(buildNumber, 10) + 1;
        let nextBuildStr = nextBuild.toString().padStart(4, '0');
        updated = true;
        newVersionString = `${prefix}${nextBuildStr}`;
        return newVersionString;
    });

    if (updated) {
        fs.writeFileSync(indexPath, content, 'utf8');
        console.log(`[Git Hook] Versão incrementada com sucesso para: ${newVersionString}`);
    }
} catch (error) {
    console.error(`[Git Hook] Erro ao tentar incrementar a versão: ${error.message}`);
}
