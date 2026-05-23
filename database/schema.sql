IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[training_records]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[training_records] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [employee_id] NVARCHAR(50) NOT NULL,
        [full_name] NVARCHAR(255) NOT NULL,
        [email] NVARCHAR(255) NOT NULL,
        [course_code] NVARCHAR(100) NOT NULL,
        [course_name] NVARCHAR(255) NOT NULL,
        [completion_date] DATE NOT NULL,
        [score] INT NOT NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT DATEADD(hour, 5, SYSUTCDATETIME())
    );

    CREATE UNIQUE INDEX UX_training_records_unique_import
        ON [dbo].[training_records] ([employee_id], [course_code], [completion_date]);
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[import_batches]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[import_batches] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [uploaded_by] NVARCHAR(100) NOT NULL,
        [uploaded_by_name] NVARCHAR(255) NOT NULL,
        [original_file_name] NVARCHAR(255) NOT NULL,
        [file_hash] NVARCHAR(64) NOT NULL,
        [total_rows] INT NOT NULL DEFAULT 0,
        [valid_rows] INT NOT NULL DEFAULT 0,
        [error_rows] INT NOT NULL DEFAULT 0,
        [inserted_rows] INT NOT NULL DEFAULT 0,
        [status] NVARCHAR(50) NOT NULL,
        [notes] NVARCHAR(MAX) NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT DATEADD(hour, 5, SYSUTCDATETIME()),
        [completed_at] DATETIME2 NULL
    );

    CREATE UNIQUE INDEX UX_import_batches_file_hash
        ON [dbo].[import_batches] ([file_hash]);
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[free_import_batches]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[free_import_batches] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [file_hash] NVARCHAR(64) NOT NULL,
        [file_name] NVARCHAR(260) NULL,
        [table_name] NVARCHAR(128) NULL,
        [row_count] INT NULL,
        [uploaded_by] NVARCHAR(100) NULL,
        [uploaded_at] DATETIME2 NOT NULL DEFAULT DATEADD(hour, 5, SYSUTCDATETIME())
    );

    CREATE UNIQUE INDEX UX_free_import_batches_hash
        ON [dbo].[free_import_batches] ([file_hash]);
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[portal_login_log]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[portal_login_log] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [username] NVARCHAR(100) NOT NULL,
        [display_name] NVARCHAR(255) NULL,
        [logged_at] DATETIME2 NOT NULL DEFAULT DATEADD(hour, 5, SYSUTCDATETIME())
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[portal_roles]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[portal_roles] (
        [username] NVARCHAR(100) NOT NULL PRIMARY KEY,
        [role] NVARCHAR(50) NOT NULL DEFAULT 'trainer',
        [granted_by] NVARCHAR(100) NULL,
        [granted_at] DATETIME2 NOT NULL DEFAULT DATEADD(hour, 5, SYSUTCDATETIME())
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[portal_template_labels]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[portal_template_labels] (
        [template_id] NVARCHAR(100) NOT NULL PRIMARY KEY,
        [display_name] NVARCHAR(255) NULL,
        [description] NVARCHAR(1000) NULL,
        [updated_by] NVARCHAR(100) NULL,
        [updated_at] DATETIME2 NOT NULL DEFAULT DATEADD(hour, 5, SYSUTCDATETIME())
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[import_errors]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[import_errors] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [batch_id] INT NOT NULL,
        [row_number] INT NULL,
        [field_name] NVARCHAR(100) NULL,
        [error_message] NVARCHAR(1000) NOT NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT DATEADD(hour, 5, SYSUTCDATETIME()),
        CONSTRAINT FK_import_errors_batch FOREIGN KEY ([batch_id]) REFERENCES [dbo].[import_batches]([id])
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[welcome_attendance]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[welcome_attendance] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [training_date] DATE NULL,
        [employee_iin] NVARCHAR(20) NULL,
        [department] NVARCHAR(255) NULL,
        [employee_name] NVARCHAR(255) NULL,
        [position] NVARCHAR(255) NULL,
        [attended] NVARCHAR(20) NULL,
        [trainer_iin] NVARCHAR(12) NULL,
        [_imported_at] DATETIME2 NOT NULL DEFAULT DATEADD(hour, 5, SYSUTCDATETIME()),
        [_imported_by] NVARCHAR(100) NULL
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[internal_trainer_sessions]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[internal_trainer_sessions] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [trainer_iin] NVARCHAR(20) NULL,
        [trainer_name] NVARCHAR(255) NULL,
        [employee_iin] NVARCHAR(20) NULL,
        [employee_name] NVARCHAR(255) NULL,
        [training_date] DATE NULL,
        [topic] NVARCHAR(255) NULL,
        [duration_min] INT NULL,
        [checklist_score] FLOAT NULL,
        [training_rate_pct] FLOAT NULL,
        [kpi_pct] FLOAT NULL,
        [kpi_growth_pct] FLOAT NULL,
        [payment_fixed] DECIMAL(10,3) NULL,
        [payment_bonus] DECIMAL(10,3) NULL,
        [has_certificate] NVARCHAR(20) NULL,
        [_imported_at] DATETIME2 NOT NULL DEFAULT DATEADD(hour, 5, SYSUTCDATETIME()),
        [_imported_by] NVARCHAR(100) NULL
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[attestation]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[attestation] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [attestation_id] NVARCHAR(48) NULL,
        [attestation_name] NVARCHAR(48) NULL,
        [exam_date] DATE NULL,
        [employee_iin] NVARCHAR(20) NULL,
        [employee_name] NVARCHAR(255) NULL,
        [bonus_score] FLOAT NULL,
        [confirmed] NVARCHAR(5) NULL,
        [_imported_at] DATETIME2 NOT NULL DEFAULT DATEADD(hour, 5, SYSUTCDATETIME()),
        [_imported_by] NVARCHAR(100) NULL
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[school_sessions]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[school_sessions] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [school_type] NVARCHAR(50) NULL,
        [employee_iin] NVARCHAR(20) NULL,
        [employee_name] NVARCHAR(255) NULL,
        [group_number] INT NULL,
        [training_date] DATE NULL,
        [module_name] NVARCHAR(255) NULL,
        [topic] NVARCHAR(255) NULL,
        [attendance_score] FLOAT NULL,
        [homework_deadline_score] FLOAT NULL,
        [homework_quality_score] FLOAT NULL,
        [completed] NVARCHAR(12) NULL,
        [_imported_at] DATETIME2 NOT NULL DEFAULT DATEADD(hour, 5, SYSUTCDATETIME()),
        [_imported_by] NVARCHAR(100) NULL
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[external_training]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[external_training] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [start_date] DATE NULL,
        [end_date] DATE NULL,
        [training_name] NVARCHAR(255) NULL,
        [employee_iin] NVARCHAR(20) NULL,
        [employee_name] NVARCHAR(255) NULL,
        [employee_rating] FLOAT NULL,
        [manager_rating] FLOAT NULL,
        [hours] FLOAT NULL,
        [cost] DECIMAL(10,3) NULL,
        [commitment_months] INT NULL,
        [repayment_term_months] INT NULL,
        [cost_30pct] DECIMAL(10,3) NULL,
        [_imported_at] DATETIME2 NOT NULL DEFAULT DATEADD(hour, 5, SYSUTCDATETIME()),
        [_imported_by] NVARCHAR(100) NULL
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[internal_training]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[internal_training] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [training_date] DATE NULL,
        [training_name] NVARCHAR(255) NULL,
        [city] NVARCHAR(100) NULL,
        [format] NVARCHAR(20) NULL,
        [trainer_iin] NVARCHAR(20) NULL,
        [trainer_name] NVARCHAR(255) NULL,
        [employee_iin] NVARCHAR(20) NULL,
        [employee_name] NVARCHAR(255) NULL,
        [attended] NVARCHAR(20) NULL,
        [employee_rating] FLOAT NULL,
        [manager_rating] FLOAT NULL,
        [hours] FLOAT NULL,
        [conduct_cost] DECIMAL(10,3) NULL,
        [_imported_at] DATETIME2 NOT NULL DEFAULT DATEADD(hour, 5, SYSUTCDATETIME()),
        [_imported_by] NVARCHAR(100) NULL
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[vendor_training]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[vendor_training] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [training_date] DATE NULL,
        [vendor] NVARCHAR(255) NULL,
        [topic] NVARCHAR(255) NULL,
        [location] NVARCHAR(255) NULL,
        [format] NVARCHAR(20) NULL,
        [employee_iin] NVARCHAR(20) NULL,
        [employee_name] NVARCHAR(255) NULL,
        [attended] NVARCHAR(20) NULL,
        [score] FLOAT NULL,
        [hours] FLOAT NULL,
        [training_rating] FLOAT NULL,
        [_imported_at] DATETIME2 NOT NULL DEFAULT DATEADD(hour, 5, SYSUTCDATETIME()),
        [_imported_by] NVARCHAR(100) NULL
    );
END;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[mentorship_program]') AND type = N'U')
BEGIN
    CREATE TABLE [dbo].[mentorship_program] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [intern_iin] NVARCHAR(20) NULL,
        [intern_name] NVARCHAR(255) NULL,
        [mentor_iin] NVARCHAR(20) NULL,
        [mentor_name] NVARCHAR(255) NULL,
        [mentor_category] NVARCHAR(10) NULL,
        [total_score] FLOAT NULL,
        [total_amount] DECIMAL(10,3) NULL,
        [intern_status] NVARCHAR(12) NULL,
        [_imported_at] DATETIME2 NOT NULL DEFAULT DATEADD(hour, 5, SYSUTCDATETIME()),
        [_imported_by] NVARCHAR(100) NULL
    );
END;
GO

-- ============================================================
-- MIGRATIONS — idempotent, run on every app start
-- ============================================================

-- welcome_attendance: rename iin → employee_iin, add trainer_iin
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.welcome_attendance') AND name = 'iin')
    EXEC sp_rename 'dbo.welcome_attendance.iin', 'employee_iin', 'COLUMN';
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.welcome_attendance') AND name = 'trainer_iin')
    ALTER TABLE [dbo].[welcome_attendance] ADD [trainer_iin] NVARCHAR(12) NULL;
GO

-- internal_trainer_sessions: DECIMAL(10,2) → DECIMAL(10,3) for payments, add has_certificate
ALTER TABLE [dbo].[internal_trainer_sessions] ALTER COLUMN [payment_fixed] DECIMAL(10,3) NULL;
ALTER TABLE [dbo].[internal_trainer_sessions] ALTER COLUMN [payment_bonus] DECIMAL(10,3) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.internal_trainer_sessions') AND name = 'has_certificate')
    ALTER TABLE [dbo].[internal_trainer_sessions] ADD [has_certificate] NVARCHAR(20) NULL;
GO

-- attestation: rename iin → employee_iin, rename full_name → employee_name, add attestation_id / attestation_name
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.attestation') AND name = 'iin')
    EXEC sp_rename 'dbo.attestation.iin', 'employee_iin', 'COLUMN';
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.attestation') AND name = 'full_name')
    EXEC sp_rename 'dbo.attestation.full_name', 'employee_name', 'COLUMN';
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.attestation') AND name = 'attestation_id')
    ALTER TABLE [dbo].[attestation] ADD [attestation_id] NVARCHAR(48) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.attestation') AND name = 'attestation_name')
    ALTER TABLE [dbo].[attestation] ADD [attestation_name] NVARCHAR(48) NULL;
GO

-- school_sessions: rename iin → employee_iin, rename name → employee_name, add completed
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.school_sessions') AND name = 'iin')
    EXEC sp_rename 'dbo.school_sessions.iin', 'employee_iin', 'COLUMN';
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.school_sessions') AND name = 'name')
    EXEC sp_rename 'dbo.school_sessions.name', 'employee_name', 'COLUMN';
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.school_sessions') AND name = 'completed')
    ALTER TABLE [dbo].[school_sessions] ADD [completed] NVARCHAR(12) NULL;
GO

-- external_training: drop status, add repayment_term_months + cost_30pct
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.external_training') AND name = 'status')
    ALTER TABLE [dbo].[external_training] DROP COLUMN [status];
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.external_training') AND name = 'repayment_term_months')
    ALTER TABLE [dbo].[external_training] ADD [repayment_term_months] INT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.external_training') AND name = 'cost_30pct')
    ALTER TABLE [dbo].[external_training] ADD [cost_30pct] DECIMAL(10,3) NULL;
GO

-- internal_training: add conduct_cost
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.internal_training') AND name = 'conduct_cost')
    ALTER TABLE [dbo].[internal_training] ADD [conduct_cost] DECIMAL(10,3) NULL;
GO

-- vendor_training: rename iin → employee_iin
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.vendor_training') AND name = 'iin')
    EXEC sp_rename 'dbo.vendor_training.iin', 'employee_iin', 'COLUMN';
GO

-- external_training: cost DECIMAL(10,2) → DECIMAL(10,3)
ALTER TABLE [dbo].[external_training] ALTER COLUMN [cost] DECIMAL(10,3) NULL;
GO

-- mentorship_program: total_amount DECIMAL(10,2) → DECIMAL(10,3)
ALTER TABLE [dbo].[mentorship_program] ALTER COLUMN [total_amount] DECIMAL(10,3) NULL;
GO

-- mentorship_program: drop obsolete columns, change total_score INT→FLOAT, add intern_status
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.mentorship_program') AND name = 'internship_start_date')
    ALTER TABLE [dbo].[mentorship_program] DROP COLUMN [internship_start_date];
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.mentorship_program') AND name = 'score_intro')
    ALTER TABLE [dbo].[mentorship_program] DROP COLUMN [score_intro];
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.mentorship_program') AND name = 'score_test')
    ALTER TABLE [dbo].[mentorship_program] DROP COLUMN [score_test];
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.mentorship_program') AND name = 'score_monthly_training')
    ALTER TABLE [dbo].[mentorship_program] DROP COLUMN [score_monthly_training];
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.mentorship_program') AND name = 'score_to')
    ALTER TABLE [dbo].[mentorship_program] DROP COLUMN [score_to];
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.mentorship_program') AND name = 'score_accessories')
    ALTER TABLE [dbo].[mentorship_program] DROP COLUMN [score_accessories];
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.mentorship_program') AND name = 'score_smarts')
    ALTER TABLE [dbo].[mentorship_program] DROP COLUMN [score_smarts];
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.mentorship_program') AND name = 'score_services')
    ALTER TABLE [dbo].[mentorship_program] DROP COLUMN [score_services];
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.mentorship_program') AND name = 'penalty_nps')
    ALTER TABLE [dbo].[mentorship_program] DROP COLUMN [penalty_nps];
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.mentorship_program') AND name = 'score_value')
    ALTER TABLE [dbo].[mentorship_program] DROP COLUMN [score_value];
ALTER TABLE [dbo].[mentorship_program] ALTER COLUMN [total_score] FLOAT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.mentorship_program') AND name = 'intern_status')
    ALTER TABLE [dbo].[mentorship_program] ADD [intern_status] NVARCHAR(12) NULL;
GO

-- Fix all UTC timestamp defaults to UTC+5 (Kazakhstan unified timezone since 2024)
DECLARE @df NVARCHAR(256);

SET @df = NULL; SELECT @df = d.name FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.portal_login_log') AND c.name='logged_at';
IF @df IS NOT NULL EXEC('ALTER TABLE [dbo].[portal_login_log] DROP CONSTRAINT ['+@df+']');
IF NOT EXISTS(SELECT 1 FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.portal_login_log') AND c.name='logged_at')
    ALTER TABLE [dbo].[portal_login_log] ADD CONSTRAINT DF_portal_login_log_logged_at DEFAULT DATEADD(hour,5,SYSUTCDATETIME()) FOR [logged_at];

SET @df = NULL; SELECT @df = d.name FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.training_records') AND c.name='created_at';
IF @df IS NOT NULL EXEC('ALTER TABLE [dbo].[training_records] DROP CONSTRAINT ['+@df+']');
IF NOT EXISTS(SELECT 1 FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.training_records') AND c.name='created_at')
    ALTER TABLE [dbo].[training_records] ADD CONSTRAINT DF_training_records_created_at DEFAULT DATEADD(hour,5,SYSUTCDATETIME()) FOR [created_at];

SET @df = NULL; SELECT @df = d.name FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.import_batches') AND c.name='created_at';
IF @df IS NOT NULL EXEC('ALTER TABLE [dbo].[import_batches] DROP CONSTRAINT ['+@df+']');
IF NOT EXISTS(SELECT 1 FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.import_batches') AND c.name='created_at')
    ALTER TABLE [dbo].[import_batches] ADD CONSTRAINT DF_import_batches_created_at DEFAULT DATEADD(hour,5,SYSUTCDATETIME()) FOR [created_at];

SET @df = NULL; SELECT @df = d.name FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.free_import_batches') AND c.name='uploaded_at';
IF @df IS NOT NULL EXEC('ALTER TABLE [dbo].[free_import_batches] DROP CONSTRAINT ['+@df+']');
IF NOT EXISTS(SELECT 1 FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.free_import_batches') AND c.name='uploaded_at')
    ALTER TABLE [dbo].[free_import_batches] ADD CONSTRAINT DF_free_import_batches_uploaded_at DEFAULT DATEADD(hour,5,SYSUTCDATETIME()) FOR [uploaded_at];

SET @df = NULL; SELECT @df = d.name FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.portal_roles') AND c.name='granted_at';
IF @df IS NOT NULL EXEC('ALTER TABLE [dbo].[portal_roles] DROP CONSTRAINT ['+@df+']');
IF NOT EXISTS(SELECT 1 FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.portal_roles') AND c.name='granted_at')
    ALTER TABLE [dbo].[portal_roles] ADD CONSTRAINT DF_portal_roles_granted_at DEFAULT DATEADD(hour,5,SYSUTCDATETIME()) FOR [granted_at];

SET @df = NULL; SELECT @df = d.name FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.portal_template_labels') AND c.name='updated_at';
IF @df IS NOT NULL EXEC('ALTER TABLE [dbo].[portal_template_labels] DROP CONSTRAINT ['+@df+']');
IF NOT EXISTS(SELECT 1 FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.portal_template_labels') AND c.name='updated_at')
    ALTER TABLE [dbo].[portal_template_labels] ADD CONSTRAINT DF_portal_template_labels_updated_at DEFAULT DATEADD(hour,5,SYSUTCDATETIME()) FOR [updated_at];

SET @df = NULL; SELECT @df = d.name FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.import_errors') AND c.name='created_at';
IF @df IS NOT NULL EXEC('ALTER TABLE [dbo].[import_errors] DROP CONSTRAINT ['+@df+']');
IF NOT EXISTS(SELECT 1 FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.import_errors') AND c.name='created_at')
    ALTER TABLE [dbo].[import_errors] ADD CONSTRAINT DF_import_errors_created_at DEFAULT DATEADD(hour,5,SYSUTCDATETIME()) FOR [created_at];

SET @df = NULL; SELECT @df = d.name FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.welcome_attendance') AND c.name='_imported_at';
IF @df IS NOT NULL EXEC('ALTER TABLE [dbo].[welcome_attendance] DROP CONSTRAINT ['+@df+']');
IF NOT EXISTS(SELECT 1 FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.welcome_attendance') AND c.name='_imported_at')
    ALTER TABLE [dbo].[welcome_attendance] ADD CONSTRAINT DF_welcome_attendance_imported_at DEFAULT DATEADD(hour,5,SYSUTCDATETIME()) FOR [_imported_at];

SET @df = NULL; SELECT @df = d.name FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.internal_trainer_sessions') AND c.name='_imported_at';
IF @df IS NOT NULL EXEC('ALTER TABLE [dbo].[internal_trainer_sessions] DROP CONSTRAINT ['+@df+']');
IF NOT EXISTS(SELECT 1 FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.internal_trainer_sessions') AND c.name='_imported_at')
    ALTER TABLE [dbo].[internal_trainer_sessions] ADD CONSTRAINT DF_internal_trainer_sessions_imported_at DEFAULT DATEADD(hour,5,SYSUTCDATETIME()) FOR [_imported_at];

SET @df = NULL; SELECT @df = d.name FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.attestation') AND c.name='_imported_at';
IF @df IS NOT NULL EXEC('ALTER TABLE [dbo].[attestation] DROP CONSTRAINT ['+@df+']');
IF NOT EXISTS(SELECT 1 FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.attestation') AND c.name='_imported_at')
    ALTER TABLE [dbo].[attestation] ADD CONSTRAINT DF_attestation_imported_at DEFAULT DATEADD(hour,5,SYSUTCDATETIME()) FOR [_imported_at];

SET @df = NULL; SELECT @df = d.name FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.school_sessions') AND c.name='_imported_at';
IF @df IS NOT NULL EXEC('ALTER TABLE [dbo].[school_sessions] DROP CONSTRAINT ['+@df+']');
IF NOT EXISTS(SELECT 1 FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.school_sessions') AND c.name='_imported_at')
    ALTER TABLE [dbo].[school_sessions] ADD CONSTRAINT DF_school_sessions_imported_at DEFAULT DATEADD(hour,5,SYSUTCDATETIME()) FOR [_imported_at];

SET @df = NULL; SELECT @df = d.name FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.external_training') AND c.name='_imported_at';
IF @df IS NOT NULL EXEC('ALTER TABLE [dbo].[external_training] DROP CONSTRAINT ['+@df+']');
IF NOT EXISTS(SELECT 1 FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.external_training') AND c.name='_imported_at')
    ALTER TABLE [dbo].[external_training] ADD CONSTRAINT DF_external_training_imported_at DEFAULT DATEADD(hour,5,SYSUTCDATETIME()) FOR [_imported_at];

SET @df = NULL; SELECT @df = d.name FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.internal_training') AND c.name='_imported_at';
IF @df IS NOT NULL EXEC('ALTER TABLE [dbo].[internal_training] DROP CONSTRAINT ['+@df+']');
IF NOT EXISTS(SELECT 1 FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.internal_training') AND c.name='_imported_at')
    ALTER TABLE [dbo].[internal_training] ADD CONSTRAINT DF_internal_training_imported_at DEFAULT DATEADD(hour,5,SYSUTCDATETIME()) FOR [_imported_at];

SET @df = NULL; SELECT @df = d.name FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.vendor_training') AND c.name='_imported_at';
IF @df IS NOT NULL EXEC('ALTER TABLE [dbo].[vendor_training] DROP CONSTRAINT ['+@df+']');
IF NOT EXISTS(SELECT 1 FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.vendor_training') AND c.name='_imported_at')
    ALTER TABLE [dbo].[vendor_training] ADD CONSTRAINT DF_vendor_training_imported_at DEFAULT DATEADD(hour,5,SYSUTCDATETIME()) FOR [_imported_at];

SET @df = NULL; SELECT @df = d.name FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.mentorship_program') AND c.name='_imported_at';
IF @df IS NOT NULL EXEC('ALTER TABLE [dbo].[mentorship_program] DROP CONSTRAINT ['+@df+']');
IF NOT EXISTS(SELECT 1 FROM sys.default_constraints d JOIN sys.columns c ON d.parent_object_id=c.object_id AND d.parent_column_id=c.column_id WHERE d.parent_object_id=OBJECT_ID('dbo.mentorship_program') AND c.name='_imported_at')
    ALTER TABLE [dbo].[mentorship_program] ADD CONSTRAINT DF_mentorship_program_imported_at DEFAULT DATEADD(hour,5,SYSUTCDATETIME()) FOR [_imported_at];

-- vendor_training: add training_rating column
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.vendor_training') AND name = 'training_rating')
    ALTER TABLE [dbo].[vendor_training] ADD [training_rating] FLOAT NULL;
GO
