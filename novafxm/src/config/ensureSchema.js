const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const hasColumn = async (queryInterface, table, column) => {
  const description = await queryInterface.describeTable(table);
  return Boolean(description[column]);
};

const addColumnIfMissing = async (queryInterface, table, column, definition) => {
  if (!(await hasColumn(queryInterface, table, column))) {
    await queryInterface.addColumn(table, column, definition);
  }
};

async function ensureSchema() {
  const queryInterface = sequelize.getQueryInterface();

  await queryInterface.createTable('projects', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    identifier: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    status: { type: DataTypes.ENUM('active', 'inactive', 'suspended'), allowNull: false, defaultValue: 'active' },
    permissions: { type: DataTypes.JSON, allowNull: true },
    symbol_visibility: { type: DataTypes.JSON, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  }).catch(() => {});

  await queryInterface.createTable('mail_settings', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
    smtp_user: { type: DataTypes.STRING(190), allowNull: true },
    smtp_pass: { type: DataTypes.TEXT, allowNull: true },
    mail_from: { type: DataTypes.STRING(255), allowNull: true },
    updated_by_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  }).catch(() => {});

  await addColumnIfMissing(queryInterface, 'projects', 'permissions', {
    type: DataTypes.JSON,
    allowNull: true,
  }).catch(() => {});
  await addColumnIfMissing(queryInterface, 'projects', 'symbol_visibility', {
    type: DataTypes.JSON,
    allowNull: true,
  }).catch(() => {});

  // Ensure 'manager' role exists in the users table ENUM
  await queryInterface.sequelize.query(
    "ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'agent', 'master', 'manager') NOT NULL DEFAULT 'user';"
  ).catch((e) => {
    console.error('Failed to update role ENUM:', e.message);
  });

  const tables = ['users', 'wallets', 'deposits', 'withdrawals', 'transactions', 'trades', 'trading_accounts', 'bank_accounts', 'deposit_method_addresses', 'symbol_visibilities', 'referral_rewards'];
  for (const table of tables) {
    await addColumnIfMissing(queryInterface, table, 'project_id', {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    }).catch(() => {});
  }

  // Seed default project and migrate existing records
  const [projects] = await queryInterface.sequelize.query('SELECT id FROM projects WHERE identifier = "novafxm"');
  let defaultProjectId;
  if (projects.length === 0) {
    const [result] = await queryInterface.sequelize.query(
      `INSERT INTO projects (name, identifier, status, created_at, updated_at) VALUES ('Nova FXM', 'novafxm', 'active', NOW(), NOW())`
    );
    defaultProjectId = result;
  } else {
    defaultProjectId = projects[0].id;
  }

  if (defaultProjectId) {
    for (const table of tables) {
      await queryInterface.sequelize.query(`UPDATE ${table} SET project_id = ${defaultProjectId} WHERE project_id IS NULL AND id > 0`).catch(() => {});
    }
  }

  // Seed VeltriumFX as a second managed company under the master
  const [veltriumProjects] = await queryInterface.sequelize.query('SELECT id FROM projects WHERE identifier = "veltriumfx"');
  let veltriumProjectId;
  if (veltriumProjects.length === 0) {
    const [vtResult] = await queryInterface.sequelize.query(
      `INSERT INTO projects (name, identifier, status, created_at, updated_at) VALUES ('VeltriumFX', 'veltriumfx', 'active', NOW(), NOW())`
    );
    veltriumProjectId = vtResult;
    // Create default VeltriumFX admin
    const bcrypt = require('bcryptjs');
    const vtAdminHash = await bcrypt.hash('admin123', 12);
    await queryInterface.sequelize.query(
      `INSERT INTO users (name, email, password, role, project_id, account_type, leverage, trading_level, trading_status, verification_status, created_at, updated_at)
       VALUES ('VeltriumFX Admin', 'admin@veltriumfx.com', '${vtAdminHash}', 'admin', ${veltriumProjectId}, 'Live', 500, 'Standard', 'active', 'unverified', NOW(), NOW())`
    );
    // Ensure admin has a wallet
    const [vtAdmin] = await queryInterface.sequelize.query(`SELECT id FROM users WHERE email = 'admin@veltriumfx.com'`);
    if (vtAdmin.length > 0) {
      await queryInterface.sequelize.query(
        `INSERT IGNORE INTO wallets (user_id, project_id, balance, equity, free_funds, bonus, margin, margin_level, created_at, updated_at)
         VALUES (${vtAdmin[0].id}, ${veltriumProjectId}, 0, 0, 0, 0, 0, 0, NOW(), NOW())`
      );
    }
  } else {
    veltriumProjectId = veltriumProjects[0].id;
  }

  // Register A5 Markets in the shared master company directory.
  const [a5Projects] = await queryInterface.sequelize.query('SELECT id FROM projects WHERE identifier = "a5markets"');
  if (a5Projects.length === 0) {
    await queryInterface.sequelize.query(
      `INSERT INTO projects (name, identifier, status, created_at, updated_at) VALUES ('A5 Markets', 'a5markets', 'active', NOW(), NOW())`
    );
  }


  await addColumnIfMissing(queryInterface, 'users', 'leverage', {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 500,
    after: 'account_type',
  });
  await queryInterface.changeColumn('users', 'leverage', {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 500,
  });
  await addColumnIfMissing(queryInterface, 'users', 'trading_level', {
    type: DataTypes.ENUM('Standard', 'Silver', 'Gold', 'Platinum'),
    allowNull: false,
    defaultValue: 'Standard',
    after: 'leverage',
  });
  await addColumnIfMissing(queryInterface, 'users', 'trading_status', {
    type: DataTypes.ENUM('active', 'frozen'),
    allowNull: false,
    defaultValue: 'active',
    after: 'trading_level',
  });
  await addColumnIfMissing(queryInterface, 'users', 'country', {
    type: DataTypes.STRING(80),
    allowNull: true,
    after: 'phone',
  });
  await addColumnIfMissing(queryInterface, 'users', 'date_of_birth', {
    type: DataTypes.STRING(20),
    allowNull: true,
    after: 'country',
  });
  await addColumnIfMissing(queryInterface, 'users', 'profile_image', {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    after: 'date_of_birth',
  });
  await addColumnIfMissing(queryInterface, 'users', 'bank_account_holder', {
    type: DataTypes.STRING(120),
    allowNull: true,
    after: 'profile_image',
  });
  await addColumnIfMissing(queryInterface, 'users', 'bank_name', {
    type: DataTypes.STRING(120),
    allowNull: true,
    after: 'bank_account_holder',
  });
  await addColumnIfMissing(queryInterface, 'users', 'bank_branch', {
    type: DataTypes.STRING(120),
    allowNull: true,
    after: 'bank_name',
  });
  await addColumnIfMissing(queryInterface, 'users', 'bank_account_number', {
    type: DataTypes.STRING(80),
    allowNull: true,
    after: 'bank_branch',
  });
  await addColumnIfMissing(queryInterface, 'users', 'reset_password_token', {
    type: DataTypes.STRING(64),
    allowNull: true,
    after: 'password',
  });
  await addColumnIfMissing(queryInterface, 'users', 'reset_password_expires', {
    type: DataTypes.DATE,
    allowNull: true,
    after: 'reset_password_token',
  });
  await addColumnIfMissing(queryInterface, 'users', 'email_verification_token', {
    type: DataTypes.STRING(64),
    allowNull: true,
    after: 'reset_password_expires',
  });
  await addColumnIfMissing(queryInterface, 'users', 'email_verification_expires', {
    type: DataTypes.DATE,
    allowNull: true,
    after: 'email_verification_token',
  });
  const emailVerifiedAtWasMissing = !(await hasColumn(queryInterface, 'users', 'email_verified_at'));
  await addColumnIfMissing(queryInterface, 'users', 'email_verified_at', {
    type: DataTypes.DATE,
    allowNull: true,
    after: 'email_verification_expires',
  });
  // Accounts created before email verification was introduced must keep
  // working after deployment; only new registrations go through the flow.
  if (emailVerifiedAtWasMissing) {
    await queryInterface.sequelize.query('UPDATE users SET email_verified_at = NOW() WHERE email_verified_at IS NULL');
  }
  await addColumnIfMissing(queryInterface, 'users', 'last_login_at', {
    type: DataTypes.DATE,
    allowNull: true,
    after: 'reset_password_expires',
  });
  await addColumnIfMissing(queryInterface, 'users', 'last_logout_at', {
    type: DataTypes.DATE,
    allowNull: true,
    after: 'last_login_at',
  });
  await addColumnIfMissing(queryInterface, 'users', 'online_until', {
    type: DataTypes.DATE,
    allowNull: true,
    after: 'last_logout_at',
  });
  await addColumnIfMissing(queryInterface, 'users', 'admin_notes', {
    type: DataTypes.TEXT,
    allowNull: true,
    after: 'trading_status',
  });
  await addColumnIfMissing(queryInterface, 'users', 'verification_status', {
    type: DataTypes.ENUM('unverified', 'pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'unverified',
    after: 'admin_notes',
  });
  await addColumnIfMissing(queryInterface, 'users', 'id_proof_image', {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    after: 'verification_status',
  });
  await addColumnIfMissing(queryInterface, 'users', 'address_proof_image', {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    after: 'id_proof_image',
  });
  await addColumnIfMissing(queryInterface, 'users', 'verification_reviewed_at', {
    type: DataTypes.DATE,
    allowNull: true,
    after: 'address_proof_image',
  });
  await addColumnIfMissing(queryInterface, 'users', 'verification_reviewed_by', {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    after: 'verification_reviewed_at',
  });
  await addColumnIfMissing(queryInterface, 'users', 'referral_code', {
    type: DataTypes.STRING(40),
    allowNull: true,
    unique: true,
    after: 'admin_notes',
  });
  await addColumnIfMissing(queryInterface, 'users', 'referred_by_id', {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    after: 'referral_code',
  });
  await addColumnIfMissing(queryInterface, 'users', 'assigned_agent_id', {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    after: 'referred_by_id',
  });
  await addColumnIfMissing(queryInterface, 'users', 'assigned_by_id', {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    after: 'assigned_agent_id',
  });
  await addColumnIfMissing(queryInterface, 'users', 'assignment_status', {
    type: DataTypes.ENUM('new', 'assigned', 'unassigned'),
    allowNull: false,
    defaultValue: 'new',
    after: 'assigned_by_id',
  });
  await queryInterface.sequelize.query(
    "UPDATE users SET assignment_status = 'assigned' WHERE assigned_agent_id IS NOT NULL AND assignment_status = 'new'"
  );
  await queryInterface.changeColumn('users', 'role', {
    type: DataTypes.ENUM('user', 'admin', 'agent', 'master', 'manager'),
    allowNull: false,
    defaultValue: 'user',
  });
  await addColumnIfMissing(queryInterface, 'users', 'permissions', {
    type: DataTypes.JSON,
    allowNull: true,
    after: 'role',
  });


  await addColumnIfMissing(queryInterface, 'wallets', 'equity', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 5000,
    after: 'balance',
  });
  await addColumnIfMissing(queryInterface, 'wallets', 'margin', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    after: 'equity',
  });
  await addColumnIfMissing(queryInterface, 'wallets', 'free_funds', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 5000,
    after: 'margin',
  });
  await addColumnIfMissing(queryInterface, 'wallets', 'bonus', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    after: 'free_funds',
  });

  await addColumnIfMissing(queryInterface, 'transactions', 'balance_before', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    after: 'amount',
  });
  await addColumnIfMissing(queryInterface, 'transactions', 'bonus', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    after: 'amount',
  });
  await addColumnIfMissing(queryInterface, 'transactions', 'balance_after', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    after: 'balance_before',
  });
  await addColumnIfMissing(queryInterface, 'transactions', 'note', {
    type: DataTypes.TEXT,
    allowNull: true,
    after: 'balance_after',
  });
  await queryInterface.changeColumn('transactions', 'type', {
    type: DataTypes.ENUM('deposit', 'withdrawal', 'admin_add_balance', 'admin_deduct_balance', 'trade_profit', 'trade_loss', 'reset_demo', 'referral'),
    allowNull: false,
  });

  await addColumnIfMissing(queryInterface, 'wallets', 'margin_level', {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: false,
    defaultValue: 0.00,
    after: 'bonus',
  });

  await addColumnIfMissing(queryInterface, 'deposits', 'receipt_image', {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    after: 'reference_number',
  });
  await addColumnIfMissing(queryInterface, 'deposits', 'trading_account_id', {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    after: 'user_id',
  });
  await addColumnIfMissing(queryInterface, 'deposits', 'bonus', {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    after: 'amount',
  });
  await addColumnIfMissing(queryInterface, 'deposits', 'currency', {
    type: DataTypes.STRING(8),
    allowNull: false,
    defaultValue: 'USD',
    after: 'amount',
  });
  await addColumnIfMissing(queryInterface, 'deposits', 'deposit_address_id', {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    after: 'payment_method',
  });
  await addColumnIfMissing(queryInterface, 'deposits', 'deposit_address_label', {
    type: DataTypes.STRING(120),
    allowNull: true,
    after: 'deposit_address_id',
  });
  await addColumnIfMissing(queryInterface, 'deposits', 'deposit_address', {
    type: DataTypes.TEXT,
    allowNull: true,
    after: 'deposit_address_label',
  });
  await queryInterface.changeColumn('deposits', 'reference_number', {
    type: DataTypes.STRING(120),
    allowNull: true,
  });

  await queryInterface.createTable('deposit_method_addresses', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    payment_method: { type: DataTypes.STRING(80), allowNull: false },
    label: { type: DataTypes.STRING(120), allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: false },
    qr_data: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  }).catch((error) => {
    if (!['ER_TABLE_EXISTS_ERROR', 'SQLITE_ERROR'].includes(error?.parent?.code) && !String(error?.message || '').includes('already exists')) throw error;
  });
  await addColumnIfMissing(queryInterface, 'deposit_method_addresses', 'qr_data', {
    type: DataTypes.TEXT,
    allowNull: true,
    after: 'address',
  });
  await addColumnIfMissing(queryInterface, 'deposit_method_addresses', 'is_active', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    after: 'qr_data',
  });
  await addColumnIfMissing(queryInterface, 'deposit_method_addresses', 'currency', {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'USD',
    after: 'is_active',
  });

  try {
    const [addrCount] = await queryInterface.sequelize.query('SELECT COUNT(*) as cnt FROM deposit_method_addresses');
    const countVal = addrCount?.[0]?.cnt || addrCount?.[0]?.['COUNT(*)'] || 0;
    if (parseInt(countVal, 10) === 0) {
      const now = new Date();
      await queryInterface.bulkInsert('deposit_method_addresses', [{
        payment_method: 'TRC20',
        label: 'TRC20 Main Wallet',
        address: 'TYD2b2D8vX4g5M6n7P8q9R0s1T2u3V4w5X',
        qr_data: 'TYD2b2D8vX4g5M6n7P8q9R0s1T2u3V4w5X',
        is_active: true,
        currency: 'USD',
        created_at: now,
        updated_at: now,
      }]);
    }
  } catch (e) {
    // Ignore seed error
  }

  await addColumnIfMissing(queryInterface, 'withdrawals', 'withdrawal_method', {
    type: DataTypes.ENUM('Bank', 'Crypto'),
    allowNull: false,
    defaultValue: 'Bank',
    after: 'amount',
  });

  await addColumnIfMissing(queryInterface, 'transactions', 'wallet_id', {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    after: 'user_id',
  });

  await addColumnIfMissing(queryInterface, 'trades', 'trading_account_id', {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    after: 'user_id',
  });
  await addColumnIfMissing(queryInterface, 'trading_accounts', 'leverage', {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 500,
    after: 'balance',
  });
  await addColumnIfMissing(queryInterface, 'trades', 'order_type', {
    type: DataTypes.ENUM('market', 'limit', 'stop'),
    allowNull: false,
    defaultValue: 'market',
    after: 'lots',
  });
  await addColumnIfMissing(queryInterface, 'trades', 'entry_price', {
    type: DataTypes.DECIMAL(18, 8),
    allowNull: true,
    after: 'order_type',
  });
  await addColumnIfMissing(queryInterface, 'trades', 'stop_loss', {
    type: DataTypes.DECIMAL(18, 8),
    allowNull: true,
    after: 'open_price',
  });
  await addColumnIfMissing(queryInterface, 'trades', 'take_profit', {
    type: DataTypes.DECIMAL(18, 8),
    allowNull: true,
    after: 'stop_loss',
  });
  await queryInterface.changeColumn('trades', 'status', {
    type: DataTypes.ENUM('pending', 'open', 'closed'),
    allowNull: false,
    defaultValue: 'open',
  });

  await queryInterface.createTable('bank_accounts', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    account_holder_name: { type: DataTypes.STRING(120), allowNull: false },
    bank_name: { type: DataTypes.STRING(120), allowNull: false },
    branch_name: { type: DataTypes.STRING(120), allowNull: true },
    account_number: { type: DataTypes.STRING(80), allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'approved', 'rejected', 'delete_pending'), allowNull: false, defaultValue: 'pending' },
    reviewed_at: { type: DataTypes.DATE, allowNull: true },
    reviewed_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  }).catch((error) => {
    if (!['ER_TABLE_EXISTS_ERROR', 'SQLITE_ERROR'].includes(error?.parent?.code) && !String(error?.message || '').includes('already exists')) throw error;
  });
  await addColumnIfMissing(queryInterface, 'bank_accounts', 'status', {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'delete_pending'),
    allowNull: false,
    defaultValue: 'pending',
    after: 'account_number',
  });
  await queryInterface.changeColumn('bank_accounts', 'status', {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'delete_pending'),
    allowNull: false,
    defaultValue: 'pending',
  });
  await addColumnIfMissing(queryInterface, 'bank_accounts', 'reviewed_at', {
    type: DataTypes.DATE,
    allowNull: true,
    after: 'status',
  });
  await addColumnIfMissing(queryInterface, 'bank_accounts', 'reviewed_by', {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    after: 'reviewed_at',
  });
  await addColumnIfMissing(queryInterface, 'bank_accounts', 'is_active', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    after: 'reviewed_by',
  });

  await queryInterface.createTable('symbol_visibilities', {
    symbol: { type: DataTypes.STRING(50), primaryKey: true, allowNull: false },
    visible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }).catch((error) => {
    if (!['ER_TABLE_EXISTS_ERROR', 'SQLITE_ERROR'].includes(error?.parent?.code) && !String(error?.message || '').includes('already exists')) throw error;
  });

  await queryInterface.createTable('referral_rewards', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    project_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    referrer_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    referee_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    deposit_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), allowNull: false, defaultValue: 'pending' },
    reviewed_at: { type: DataTypes.DATE, allowNull: true },
    reviewed_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  }).catch((error) => {
    if (!['ER_TABLE_EXISTS_ERROR', 'SQLITE_ERROR'].includes(error?.parent?.code) && !String(error?.message || '').includes('already exists')) throw error;
  });

  // Create default master user if it doesn't exist
  const [masters] = await queryInterface.sequelize.query('SELECT id FROM users WHERE email = "master@novafxm.com"');
  if (masters.length === 0) {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('master123', 10);
    await queryInterface.sequelize.query(
      `INSERT INTO users (name, email, password, role, account_type, leverage, trading_level, trading_status, verification_status, created_at, updated_at) 
       VALUES ('Master Admin', 'master@novafxm.com', '${hash}', 'master', 'Demo', 500, 'Standard', 'active', 'unverified', NOW(), NOW())`
    );
  }

  // Migrate existing deposits to referral_rewards
  try {
    const [deposits] = await queryInterface.sequelize.query(`
      SELECT d.id, d.user_id, d.amount, d.status, d.project_id, u.referred_by_id
      FROM deposits d
      INNER JOIN users u ON d.user_id = u.id
      WHERE u.referred_by_id IS NOT NULL AND d.amount > 0
    `);

    for (const dep of deposits) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM referral_rewards WHERE deposit_id = ${dep.id}`
      );
      if (existing.length === 0) {
        const rewardAmount = Number((dep.amount * 0.10).toFixed(2));
        if (rewardAmount > 0) {
          let rewardStatus = 'pending';
          if (dep.status === 'rejected') {
            rewardStatus = 'rejected';
          }
          await queryInterface.sequelize.query(`
            INSERT INTO referral_rewards (project_id, referrer_id, referee_id, deposit_id, amount, status, created_at, updated_at)
            VALUES (
              ${dep.project_id || 'NULL'},
              ${dep.referred_by_id},
              ${dep.user_id},
              ${dep.id},
              ${rewardAmount},
              '${rewardStatus}',
              NOW(),
              NOW()
            )
          `);
        }
      }
    }
  } catch (err) {
    console.error('Failed to migrate existing deposits to referral rewards:', err.message);
  }

  // Retroactively create mock deposit records and referral rewards for manual admin balance additions
  try {
    const [referredUsers] = await queryInterface.sequelize.query(`
      SELECT id, referred_by_id, project_id FROM users WHERE referred_by_id IS NOT NULL
    `);

    for (const u of referredUsers) {
      const [balanceAdds] = await queryInterface.sequelize.query(`
        SELECT SUM(amount) as total FROM transactions 
        WHERE user_id = ${u.id} AND type = 'admin_add_balance' AND status = 'completed'
      `);
      const totalManual = Number(balanceAdds[0]?.total || 0);

      if (totalManual > 0) {
        const [existingRewards] = await queryInterface.sequelize.query(`
          SELECT id FROM referral_rewards WHERE referee_id = ${u.id}
        `);
        const [existingDeposits] = await queryInterface.sequelize.query(`
          SELECT id FROM deposits WHERE user_id = ${u.id}
        `);

        if (existingRewards.length === 0 && existingDeposits.length === 0) {
          await queryInterface.sequelize.query(`
            INSERT INTO deposits (project_id, user_id, amount, currency, payment_method, status, created_at, updated_at)
            VALUES (${u.project_id || 'NULL'}, ${u.id}, ${totalManual}, 'USD', 'Admin Adjustment', 'approved', NOW(), NOW())
          `);
          const [newDep] = await queryInterface.sequelize.query(`
            SELECT id FROM deposits WHERE user_id = ${u.id} AND payment_method = 'Admin Adjustment' ORDER BY id DESC LIMIT 1
          `);
          const depositId = newDep[0]?.id;

          if (depositId) {
            const rewardAmount = Number((totalManual * 0.10).toFixed(2));
            await queryInterface.sequelize.query(`
              INSERT INTO referral_rewards (project_id, referrer_id, referee_id, deposit_id, amount, status, created_at, updated_at)
              VALUES (${u.project_id || 'NULL'}, ${u.referred_by_id}, ${u.id}, ${depositId}, ${rewardAmount}, 'pending', NOW(), NOW())
            `);
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to migrate manual admin balance additions:', err.message);
  }

  // Create admin_notifications table
  await queryInterface.createTable('admin_notifications', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    project_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    type: {
      type: DataTypes.ENUM('new_user', 'new_deposit', 'new_withdrawal', 'kyc_submitted', 'bank_account_pending', 'user_notification'),
      allowNull: false,
    },
    title: { type: DataTypes.STRING(200), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: true },
    reference_type: { type: DataTypes.STRING(80), allowNull: true },
    reference_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    is_read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    read_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  }).catch((error) => {
    if (!['ER_TABLE_EXISTS_ERROR', 'SQLITE_ERROR'].includes(error?.parent?.code) && !String(error?.message || '').includes('already exists')) throw error;
  });

  await addColumnIfMissing(queryInterface, 'admin_notifications', 'project_id', {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  }).catch(() => {});
  await addColumnIfMissing(queryInterface, 'admin_notifications', 'reference_type', {
    type: DataTypes.STRING(80),
    allowNull: true,
  }).catch(() => {});
  await addColumnIfMissing(queryInterface, 'admin_notifications', 'reference_id', {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  }).catch(() => {});
  await addColumnIfMissing(queryInterface, 'admin_notifications', 'user_id', {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  }).catch(() => {});
  await addColumnIfMissing(queryInterface, 'admin_notifications', 'is_read', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  }).catch(() => {});
  await addColumnIfMissing(queryInterface, 'admin_notifications', 'read_at', {
    type: DataTypes.DATE,
    allowNull: true,
  }).catch(() => {});
}

module.exports = ensureSchema;
