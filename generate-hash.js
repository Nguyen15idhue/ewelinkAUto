const bcrypt = require('bcryptjs');

async function generateHash() {
    const password = 'Geotek@2025';
    const hash = await bcrypt.hash(password, 10);
    console.log('Password:', password);
    console.log('Hash:', hash);
}

generateHash();