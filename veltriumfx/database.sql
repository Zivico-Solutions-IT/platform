CREATE DATABASE IF NOT EXISTS novafxm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE novafxm_db;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(30) NULL,
  country VARCHAR(80) NULL,
  date_of_birth VARCHAR(20) NULL,
  profile_image LONGTEXT NULL,
  bank_account_holder VARCHAR(120) NULL,
  bank_name VARCHAR(120) NULL,
  bank_branch VARCHAR(120) NULL,
  bank_account_number VARCHAR(80) NULL,
  password VARCHAR(255) NOT NULL,
  reset_password_token VARCHAR(64) NULL,
  reset_password_expires DATETIME NULL,
  last_login_at DATETIME NULL,
  last_logout_at DATETIME NULL,
  role ENUM('user', 'admin', 'agent', 'master', 'manager') NOT NULL DEFAULT 'user',
  permissions JSON NULL,
  account_type ENUM('Demo', 'Live') NOT NULL DEFAULT 'Demo',
  leverage INT UNSIGNED NOT NULL DEFAULT 500,
  trading_level ENUM('Standard', 'Silver', 'Gold', 'Platinum') NOT NULL DEFAULT 'Standard',
  trading_status ENUM('active', 'frozen') NOT NULL DEFAULT 'active',
  admin_notes TEXT NULL,
  verification_status ENUM('unverified', 'pending', 'approved', 'rejected') NOT NULL DEFAULT 'unverified',
  id_proof_image LONGTEXT NULL,
  address_proof_image LONGTEXT NULL,
  verification_reviewed_at DATETIME NULL,
  verification_reviewed_by INT UNSIGNED NULL,
  referral_code VARCHAR(40) NULL UNIQUE,
  referred_by_id INT UNSIGNED NULL,
  assigned_agent_id INT UNSIGNED NULL,
  assigned_by_id INT UNSIGNED NULL,
  assignment_status ENUM('new', 'assigned', 'unassigned') NOT NULL DEFAULT 'new',
  staff_access_locked TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS registration_codes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL UNIQUE,
  code VARCHAR(40) NOT NULL,
  updated_by_id INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS wallets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL UNIQUE,
  balance DECIMAL(15,2) NOT NULL DEFAULT 5000.00,
  equity DECIMAL(15,2) NOT NULL DEFAULT 5000.00,
  margin DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  free_funds DECIMAL(15,2) NOT NULL DEFAULT 5000.00,
  bonus DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS deposits (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  trading_account_id INT UNSIGNED NULL,
  amount DECIMAL(15,2) NOT NULL,
  bonus DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(8) NOT NULL DEFAULT 'USD',
  payment_method VARCHAR(80) NOT NULL,
  deposit_address_id INT UNSIGNED NULL,
  deposit_address_label VARCHAR(120) NULL,
  deposit_address TEXT NULL,
  reference_number VARCHAR(120) NULL,
  note TEXT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  reviewed_at DATETIME NULL,
  reviewed_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_deposit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_deposit_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS deposit_method_addresses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  payment_method VARCHAR(80) NOT NULL,
  label VARCHAR(120) NULL,
  address TEXT NOT NULL,
  qr_data TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  currency VARCHAR(20) NOT NULL DEFAULT 'USD',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS withdrawals (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  withdrawal_method ENUM('Bank', 'Crypto') NOT NULL DEFAULT 'Bank',
  bank_name VARCHAR(120) NOT NULL,
  account_number VARCHAR(80) NOT NULL,
  account_holder_name VARCHAR(120) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  reviewed_at DATETIME NULL,
  reviewed_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_withdrawal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_withdrawal_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bank_accounts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  account_holder_name VARCHAR(120) NOT NULL,
  bank_name VARCHAR(120) NOT NULL,
  branch_name VARCHAR(120) NULL,
  account_number VARCHAR(80) NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'delete_pending') NOT NULL DEFAULT 'pending',
  reviewed_at DATETIME NULL,
  reviewed_by INT UNSIGNED NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS referral_rewards (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NULL,
  referrer_id INT UNSIGNED NOT NULL,
  referee_id INT UNSIGNED NOT NULL,
  deposit_id INT UNSIGNED NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  reviewed_at DATETIME NULL,
  reviewed_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_referral_reward_referrer FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_referral_reward_referee FOREIGN KEY (referee_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_referral_reward_deposit FOREIGN KEY (deposit_id) REFERENCES deposits(id) ON DELETE CASCADE,
  CONSTRAINT fk_referral_reward_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS transactions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  type ENUM('deposit', 'withdrawal', 'admin_add_balance', 'admin_deduct_balance', 'trade_profit', 'trade_loss', 'reset_demo', 'referral') NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  bonus DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  balance_before DECIMAL(15,2) NULL,
  balance_after DECIMAL(15,2) NULL,
  note TEXT NULL,
  status ENUM('pending', 'approved', 'rejected', 'completed') NOT NULL DEFAULT 'pending',
  reference_type VARCHAR(40) NULL,
  reference_id INT UNSIGNED NULL,
  description VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_transactions_reference (reference_type, reference_id),
  CONSTRAINT fk_transaction_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS trades (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  symbol VARCHAR(30) NOT NULL,
  side ENUM('BUY', 'SELL') NOT NULL,
  lots DECIMAL(10,2) NOT NULL,
  open_price DECIMAL(18,8) NOT NULL,
  close_price DECIMAL(18,8) NULL,
  profit DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  margin DECIMAL(15,2) NOT NULL,
  status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
  closed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_trades_user_status (user_id, status),
  CONSTRAINT fk_trade_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

DROP PROCEDURE IF EXISTS upgrade_admin_wallet_schema;
DELIMITER $$
CREATE PROCEDURE upgrade_admin_wallet_schema()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'leverage') THEN
    ALTER TABLE users ADD COLUMN leverage INT UNSIGNED NOT NULL DEFAULT 500 AFTER account_type;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'trading_level') THEN
    ALTER TABLE users ADD COLUMN trading_level ENUM('Standard', 'Silver', 'Gold', 'Platinum') NOT NULL DEFAULT 'Standard' AFTER leverage;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'trading_status') THEN
    ALTER TABLE users ADD COLUMN trading_status ENUM('active', 'frozen') NOT NULL DEFAULT 'active' AFTER trading_level;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'admin_notes') THEN
    ALTER TABLE users ADD COLUMN admin_notes TEXT NULL AFTER trading_status;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'country') THEN
    ALTER TABLE users ADD COLUMN country VARCHAR(80) NULL AFTER phone;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'date_of_birth') THEN
    ALTER TABLE users ADD COLUMN date_of_birth VARCHAR(20) NULL AFTER country;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'profile_image') THEN
    ALTER TABLE users ADD COLUMN profile_image LONGTEXT NULL AFTER date_of_birth;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'bank_account_holder') THEN
    ALTER TABLE users ADD COLUMN bank_account_holder VARCHAR(120) NULL AFTER profile_image;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'bank_name') THEN
    ALTER TABLE users ADD COLUMN bank_name VARCHAR(120) NULL AFTER bank_account_holder;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'bank_branch') THEN
    ALTER TABLE users ADD COLUMN bank_branch VARCHAR(120) NULL AFTER bank_name;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'bank_account_number') THEN
    ALTER TABLE users ADD COLUMN bank_account_number VARCHAR(80) NULL AFTER bank_branch;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'reset_password_token') THEN
    ALTER TABLE users ADD COLUMN reset_password_token VARCHAR(64) NULL AFTER password;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'reset_password_expires') THEN
    ALTER TABLE users ADD COLUMN reset_password_expires DATETIME NULL AFTER reset_password_token;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'last_login_at') THEN
    ALTER TABLE users ADD COLUMN last_login_at DATETIME NULL AFTER reset_password_expires;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'last_logout_at') THEN
    ALTER TABLE users ADD COLUMN last_logout_at DATETIME NULL AFTER last_login_at;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'verification_status') THEN
    ALTER TABLE users ADD COLUMN verification_status ENUM('unverified', 'pending', 'approved', 'rejected') NOT NULL DEFAULT 'unverified' AFTER admin_notes;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id_proof_image') THEN
    ALTER TABLE users ADD COLUMN id_proof_image LONGTEXT NULL AFTER verification_status;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'address_proof_image') THEN
    ALTER TABLE users ADD COLUMN address_proof_image LONGTEXT NULL AFTER id_proof_image;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'verification_reviewed_at') THEN
    ALTER TABLE users ADD COLUMN verification_reviewed_at DATETIME NULL AFTER address_proof_image;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'verification_reviewed_by') THEN
    ALTER TABLE users ADD COLUMN verification_reviewed_by INT UNSIGNED NULL AFTER verification_reviewed_at;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'referral_code') THEN
    ALTER TABLE users ADD COLUMN referral_code VARCHAR(40) NULL UNIQUE AFTER verification_reviewed_by;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'referred_by_id') THEN
    ALTER TABLE users ADD COLUMN referred_by_id INT UNSIGNED NULL AFTER referral_code;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'assigned_agent_id') THEN
    ALTER TABLE users ADD COLUMN assigned_agent_id INT UNSIGNED NULL AFTER referred_by_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'assigned_by_id') THEN
    ALTER TABLE users ADD COLUMN assigned_by_id INT UNSIGNED NULL AFTER assigned_agent_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'assignment_status') THEN
    ALTER TABLE users ADD COLUMN assignment_status ENUM('new', 'assigned', 'unassigned') NOT NULL DEFAULT 'new' AFTER assigned_by_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'staff_access_locked') THEN
    ALTER TABLE users ADD COLUMN staff_access_locked TINYINT(1) NOT NULL DEFAULT 0 AFTER assignment_status;
  END IF;
  UPDATE users SET assignment_status = 'assigned' WHERE assigned_agent_id IS NOT NULL AND assignment_status = 'new';
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wallets' AND COLUMN_NAME = 'equity') THEN
    ALTER TABLE wallets ADD COLUMN equity DECIMAL(15,2) NOT NULL DEFAULT 5000.00 AFTER balance;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wallets' AND COLUMN_NAME = 'margin') THEN
    ALTER TABLE wallets ADD COLUMN margin DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER equity;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wallets' AND COLUMN_NAME = 'free_funds') THEN
    ALTER TABLE wallets ADD COLUMN free_funds DECIMAL(15,2) NOT NULL DEFAULT 5000.00 AFTER margin;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wallets' AND COLUMN_NAME = 'bonus') THEN
    ALTER TABLE wallets ADD COLUMN bonus DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER free_funds;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'balance_before') THEN
    ALTER TABLE transactions ADD COLUMN balance_before DECIMAL(15,2) NULL AFTER amount;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'bonus') THEN
    ALTER TABLE transactions ADD COLUMN bonus DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER amount;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'balance_after') THEN
    ALTER TABLE transactions ADD COLUMN balance_after DECIMAL(15,2) NULL AFTER balance_before;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'note') THEN
    ALTER TABLE transactions ADD COLUMN note TEXT NULL AFTER balance_after;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'withdrawals' AND COLUMN_NAME = 'withdrawal_method') THEN
    ALTER TABLE withdrawals ADD COLUMN withdrawal_method ENUM('Bank', 'Crypto') NOT NULL DEFAULT 'Bank' AFTER amount;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'deposits' AND COLUMN_NAME = 'trading_account_id') THEN
    ALTER TABLE deposits ADD COLUMN trading_account_id INT UNSIGNED NULL AFTER user_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'deposits' AND COLUMN_NAME = 'bonus') THEN
    ALTER TABLE deposits ADD COLUMN bonus DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER amount;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'trading_accounts')
     AND NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'trading_accounts' AND COLUMN_NAME = 'leverage') THEN
    ALTER TABLE trading_accounts ADD COLUMN leverage INT UNSIGNED NOT NULL DEFAULT 500 AFTER balance;
  END IF;
  ALTER TABLE transactions MODIFY COLUMN type ENUM('deposit', 'withdrawal', 'admin_add_balance', 'admin_deduct_balance', 'trade_profit', 'trade_loss', 'reset_demo', 'referral') NOT NULL;
  IF EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'deposits' AND COLUMN_NAME = 'reference_number') THEN
    ALTER TABLE deposits MODIFY COLUMN reference_number VARCHAR(120) NULL;
  END IF;
END$$
DELIMITER ;
CALL upgrade_admin_wallet_schema();
DROP PROCEDURE upgrade_admin_wallet_schema;
