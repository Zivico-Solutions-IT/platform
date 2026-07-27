const fs = require('fs');
const path = require('path');

const files = [
  '../app/admin.js',
  '../src/components/admin/AdminSidebar.js',
  '../src/components/admin/AdminUsersTable.js',
  '../src/components/admin/SymbolSettings.js',
  '../src/components/admin/UpdateBalanceModal.js',
  '../src/components/admin/UserManagement.js',
  '../src/components/admin/UserSettingsModal.js',
  '../src/components/admin/UserTransactionsModal.js',
  '../src/components/admin/UserWalletDetails.js',
  '../src/components/admin/verificationApprovales.js',
];

const basePath = __dirname;

files.forEach(file => {
  const fullPath = path.resolve(basePath, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');

    // Extract darkMode if not already present
    // First, check if darkMode is already extracted in useAppTheme
    const useAppThemeMatch = content.match(/const\s*{\s*([^}]+)\s*}\s*=\s*useAppTheme\(\)/g);
    if (useAppThemeMatch) {
      useAppThemeMatch.forEach(match => {
        if (!match.includes('darkMode')) {
          const replaced = match.replace('{', '{ darkMode,');
          content = content.replace(match, replaced);
        }
      });
    }

    // Replace roundings
    content = content.replace(/rounded-md/g, 'rounded-xl');
    content = content.replace(/rounded-lg/g, 'rounded-2xl');

    // Add shadow and border logic
    // We will match variations of backgroundColor: colors.panel, borderColor: colors.border
    content = content.replace(/backgroundColor:\s*colors\.panel,\s*borderColor:\s*colors\.border/g, "backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16");

    fs.writeFileSync(fullPath, content);
    console.log('Processed', file);
  } else {
    console.log('Not found', file);
  }
});
