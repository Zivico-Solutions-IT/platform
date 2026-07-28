require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
  console.log('Testing MySQL Connection with .env credentials:');
  console.log('DB_HOST:', process.env.DB_HOST || 'localhost');
  console.log('DB_USER:', process.env.DB_USER);
  console.log('DB_NAME:', process.env.DB_NAME);
  console.log('DB_PORT:', process.env.DB_PORT || 3306);

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '3306', 10),
    });
    console.log('✅ SUCCESS! Connected to Hostinger Remote MySQL Database!');
    await connection.end();
  } catch (error) {
    console.error('❌ CONNECTION ERROR:', error.code, error.message);
  }
}

testConnection();
