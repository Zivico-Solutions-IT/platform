const mysql = require('mysql2/promise');

async function testVeltrium() {
  console.log('Testing Veltrium Database with working Nova credentials:');
  try {
    const connection = await mysql.createConnection({
      host: 'srv1853.hstgr.io',
      user: 'u512178113_nova',
      password: 'NovaFxm@2026',
      database: 'u512178113_veltriumfx_db',
      port: 3306,
    });
    console.log('✅ SUCCESS! u512178113_nova CAN connect to u512178113_veltriumfx_db!');
    await connection.end();
  } catch (error) {
    console.error('❌ Failed with u512178113_nova:', error.message);
  }
}

testVeltrium();
