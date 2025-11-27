const { app } = require('electron');
const path = require('path');
const dotenv = require('dotenv');

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// We need to wait for app ready to use some electron features, though keytar might work without it.
// But running as an electron app is safer for native modules.
app.whenReady().then(async () => {
    console.log('--- DIAGNOSTICS START ---');
    console.log('GMAIL_CLIENT_ID:', process.env.GMAIL_CLIENT_ID ? 'Set (Length: ' + process.env.GMAIL_CLIENT_ID.length + ')' : 'Missing');
    console.log('GMAIL_CLIENT_SECRET:', process.env.GMAIL_CLIENT_SECRET ? 'Set (Length: ' + process.env.GMAIL_CLIENT_SECRET.length + ')' : 'Missing');
    console.log('GMAIL_REDIRECT_URI:', process.env.GMAIL_REDIRECT_URI);

    try {
        // Try to require keytar
        const keytar = require('keytar');
        console.log('Keytar module loaded successfully');

        const service = 'CareerManagerTest';
        const account = 'test_account';
        const password = 'test_password_' + Date.now();

        await keytar.setPassword(service, account, password);
        console.log('Keytar setPassword success');

        const retrieved = await keytar.getPassword(service, account);
        console.log('Keytar getPassword result matches:', retrieved === password);

        await keytar.deletePassword(service, account);
        console.log('Keytar deletePassword success');

    } catch (e) {
        console.error('Keytar/Native Module Error:', e);
    }

    console.log('--- DIAGNOSTICS END ---');
    app.quit();
});
